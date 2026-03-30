import express from 'express';
import { models, sequelize } from '../models/index.js';
import { verifyToken, isOpsOrAdmin } from '../middleware/verifyToken.js';
import { Op } from 'sequelize';

const router = express.Router();
const { Department, Student, Program, Subject, Module, User, Payment, CenterSubDept, AdmissionSession, AuditLog, CenterProgram } = models;

const getSubDeptId = (user) => {
  if (!user) return null;
  const unitStr = (user.subDepartment || user.role || '').toLowerCase();
  if (unitStr.includes('openschool')) return 8;
  if (unitStr.includes('online')) return 9;
  if (unitStr.includes('skill')) return 10;
  if (unitStr.includes('bvoc')) return 11;
  return null;
};

// ==========================================
// CENTER AUDIT SYSTEM
// ==========================================

router.get('/centers/pending', verifyToken, isOpsOrAdmin, async (req, res) => {
  try {
    const whereClause = { 
      type: { [Op.in]: ['center', 'study-center'] }, 
      auditStatus: 'pending' 
    };
    
    // Isolation: Sub-Dept Admin only sees centers mapped to their unit
    if (['SUB_DEPT_ADMIN', 'openschool', 'online', 'skill', 'bvoc'].includes(req.user.role)) {
      const subDeptMapReverse = { 8: 'openschool', 9: 'online', 10: 'skill', 11: 'bvoc' };
      const subDeptId = getSubDeptId(req.user);
      const subDeptName = subDeptMapReverse[subDeptId] || req.user.subDepartment;

      const mappedCenterIds = await CenterProgram.findAll({
        where: { subDeptId: subDeptId, isActive: true },
        attributes: ['centerId']
      }).then(res => [...new Set(res.map(c => c.centerId))]);
      
      whereClause.id = { [Op.in]: mappedCenterIds };
    }

    const centers = await Department.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']]
    });
    res.json(centers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pending center audits' });
  }
});

router.get('/centers/approved', verifyToken, isOpsOrAdmin, async (req, res) => {
  try {
    const centers = await Department.findAll({
      where: { 
        type: { [Op.in]: ['center', 'study-center'] }, 
        auditStatus: 'approved' 
      }
    });
    res.json(centers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch approved centers' });
  }
});

router.put('/centers/:id/audit', verifyToken, isOpsOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason, infrastructureDetails, subDepartments } = req.body;

    const center = await Department.findByPk(id);
    if (!center || center.type !== 'center') {
      return res.status(404).json({ error: 'Study center not found' });
    }

    await center.update({
      auditStatus: status,
      rejectionReason: status === 'rejected' ? reason : null,
      infrastructureDetails: infrastructureDetails || center.infrastructureDetails,
      status: status === 'approved' ? 'active' : 'inactive'
    });

    // Jurisdictional boundaries are now tracked via CenterProgram, no manual sync needed here.

    res.json({ message: `Center audit ${status} successfully and jurisdictional boundaries synchronized.`, center });
  } catch (error) {
    res.status(500).json({ error: 'Audit protocol failure' });
  }
});

// ==========================================
// SYLLABUS MANAGEMENT
// ==========================================

router.post('/subjects', verifyToken, isOpsOrAdmin, async (req, res) => {
  try {
    const subject = await Subject.create(req.body);
    res.status(201).json(subject);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add academic subject' });
  }
});

router.post('/modules', verifyToken, isOpsOrAdmin, async (req, res) => {
  try {
    const module = await Module.create(req.body);
    res.status(201).json(module);
  } catch (error) {
    res.status(500).json({ error: 'Failed to define module structure' });
  }
});

router.delete('/subjects/:id', verifyToken, isOpsOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await Subject.destroy({ where: { id } });
    res.json({ message: 'Subject removed from architecture' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to revoke subject' });
  }
});

router.delete('/modules/:id', verifyToken, isOpsOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await Module.destroy({ where: { id } });
    res.json({ message: 'Module purged from subject' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete module' });
  }
});

router.put('/programs/:id/syllabus', verifyToken, isOpsOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { syllabusDoc } = req.body;
    
    const program = await Program.findByPk(id);
    if (!program) return res.status(404).json({ error: 'Program not found' });

    await program.update({ syllabusDoc });
    res.json({ message: 'Syllabus PDF manifest updated', program });
  } catch (error) {
    res.status(500).json({ error: 'Failed to link syllabus document' });
  }
});

// ==========================================
// OPERATIONS DASHBOARD & ANALYTICS
// ==========================================

router.get('/stats/academic-overview', verifyToken, isOpsOrAdmin, async (req, res) => {
  try {
    const { subDeptId: querySubDeptId } = req.query;
    const isSubDeptAdmin = ['SUB_DEPT_ADMIN', 'openschool', 'online', 'skill', 'bvoc'].includes(req.user.role);
    const subDeptId = isSubDeptAdmin ? getSubDeptId(req.user) : querySubDeptId;
    
    // Base stats
    const whereClause = subDeptId ? { subDepartmentId: subDeptId } : {};

    const [totalStudents, pendingReviews, rejections, statusData] = await Promise.all([
      Student.count({ where: whereClause }),
      Student.count({ where: { ...whereClause, status: 'PENDING_REVIEW' } }),
      Student.count({ where: { ...whereClause, status: 'REJECTED' } }),
      Student.findAll({
        where: whereClause,
        attributes: [
          'status',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['status'],
        raw: true
      })
    ]);

    const stats = {
      totalStudents,
      pendingReviews,
      approvalRate: totalStudents > 0 ? (((totalStudents - rejections) / totalStudents) * 100).toFixed(1) : 0,
      statusDistribution: statusData.map(s => ({ name: s.status, value: parseInt(s.count) }))
    };

    // If Ops Admin, add breakdown
    if (!isSubDeptAdmin) {
      const subDeptIds = [8, 9, 10, 11];
      const subDeptNames = ['Open School', 'Online', 'Skill', 'BVoc'];
      const subDeptKeys = ['openschool', 'online', 'skill', 'bvoc'];

      const breakdown = await Promise.all(subDeptIds.map(async (id, index) => {
        const key = subDeptKeys[index];
        const name = subDeptNames[index];
        
        const [studentCount, programCount, centerCount] = await Promise.all([
          Student.count({ where: { subDepartmentId: id } }),
          Program.count({ where: { subDeptId: id } }),
          CenterProgram.count({ 
            where: { subDeptId: id },
            distinct: true,
            col: 'centerId'
          })
        ]);

        return {
          id,
          name,
          studentCount,
          programCount,
          centerCount
        };
      }));
      stats.unitBreakdown = breakdown;
    }

    // 6-Month Admission Velocity Trend (MySQL)
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 5);
    startDate.setDate(1);

    const admissionsByMonth = await Student.findAll({
      where: {
        ...whereClause,
        createdAt: { [Op.gte]: startDate }
      },
      attributes: [
        [sequelize.fn('MONTH', sequelize.col('createdAt')), 'month'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: [sequelize.fn('MONTH', sequelize.col('createdAt'))],
      raw: true
    });

    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const mLabel = d.toLocaleString('default', { month: 'short' });
      const mVal = d.getMonth() + 1;
      const data = admissionsByMonth.find(a => parseInt(a.month) === mVal);
      months.push({ month: mLabel, count: data ? data.count : 0 });
    }
    stats.trend = months;

    // Recent Academic Actions (Audit Logs)
    const recentLogs = await AuditLog.findAll({
      limit: 5,
      order: [['timestamp', 'DESC']],
      include: [{ model: User, as: 'user', attributes: ['name', 'role'] }]
    });
    stats.recentActions = recentLogs;

    // Global Batch Count
    const totalBatches = await AdmissionSession.count({ where: subDeptId ? { subDeptId } : {} });
    stats.totalBatches = totalBatches;

    res.json(stats);
  } catch (error) {
    console.error('Overview stats error:', error);
    res.status(500).json({ error: 'Analytics engine failure' });
  }
});

router.get('/performance/centers', verifyToken, isOpsOrAdmin, async (req, res) => {
  try {
    const { subDeptId: querySubDeptId } = req.query;
    const whereClause = { 
       type: { [Op.in]: ['center', 'study-center'] } 
    };
    const isSubDeptAdmin = ['SUB_DEPT_ADMIN', 'openschool', 'online', 'skill', 'bvoc', 'Openschool', 'Online', 'Skill', 'Bvoc'].includes(req.user.role);
    const sid = isSubDeptAdmin ? getSubDeptId(req.user) : querySubDeptId;

    if (sid) {
      whereClause.id = {
        [Op.in]: sequelize.literal(`(SELECT DISTINCT centerId FROM center_programs WHERE subDeptId = ${sid} AND isActive = true)`)
      };
    }

    const centers = await Department.findAll({
      where: whereClause,
      attributes: [
        'id', 'name', 'status', 'shortName',
        [sequelize.literal(`(SELECT COUNT(*) FROM students WHERE students.centerId = department.id ${sid ? `AND students.subDepartmentId = ${sid}` : ''})`), 'studentCount'],
        [sequelize.literal(`(SELECT COUNT(*) FROM center_programs WHERE center_programs.centerId = department.id AND center_programs.isActive = true ${sid ? `AND center_programs.subDeptId = ${sid}` : ''})`), 'activePrograms']
      ]
    });
    res.json(centers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to aggregate performance data' });
  }
});

// ==========================================
// ADMISSION PIPELINE
// ==========================================

router.get('/pipeline', verifyToken, isOpsOrAdmin, async (req, res) => {
  try {
    const isSubDeptAdmin = ['SUB_DEPT_ADMIN', 'openschool', 'online', 'skill', 'bvoc'].includes(req.user.role);
    const subDeptId = getSubDeptId(req.user);
    const whereClause = isSubDeptAdmin ? { subDepartmentId: subDeptId } : {};

    const stats = await Student.findAll({
      where: whereClause,
      attributes: [
        'subDepartmentId',
        'reviewStage',
        'enrollStatus',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['subDepartmentId', 'reviewStage', 'enrollStatus']
    });
    res.json(stats);
  } catch (error) {
    console.error('Pipeline error:', error);
    res.status(500).json({ error: 'Pipeline visualizer failed' });
  }
});

export default router;
