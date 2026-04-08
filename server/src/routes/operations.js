import express from 'express';
import { models, sequelize } from '../models/index.js';
import { verifyToken, isOpsOrAdmin } from '../middleware/verifyToken.js';
import { Op } from 'sequelize';
import bcrypt from 'bcryptjs';

const router = express.Router();
const { Department, Student, Program, Subject, Module, User, Payment, CenterSubDept, AdmissionSession, AuditLog, CenterProgram, Notification } = models;

const getSubDeptId = (user) => {
  if (!user) return null;
  const unitStr = (user.subDepartment || user.role || '').toLowerCase();
  if (unitStr.includes('Open School Admin')) return 8;
  if (unitStr.includes('Online Department Admin')) return 9;
  if (unitStr.includes('Skill Department Admin')) return 10;
  if (unitStr.includes('BVoc Department Admin')) return 11;
  return null;
};

// ==========================================
// CENTER AUDIT SYSTEM
// ==========================================

router.get('/centers/audit-list', verifyToken, isOpsOrAdmin, async (req, res) => {
  try {
    const { status } = req.query; // pending | approved | rejected
    const whereClause = { 
      type: { [Op.in]: ['partner-center', 'partner centers'] }, 
      auditStatus: status || 'pending' 
    };
    
    // Isolation: Sub-Dept Admin only sees centers mapped to their unit
    if (['SUB_DEPT_ADMIN', 'Openschool', 'Online', 'Skill', 'Bvoc', 'Open School Admin', 'Online Department Admin', 'Skill Department Admin', 'BVoc Department Admin'].includes(req.user.role)) {
      const subDeptId = getSubDeptId(req.user);

      const mappedCenterIds = await CenterProgram.findAll({
        where: { subDeptId: subDeptId, isActive: true },
        attributes: ['centerId']
      }).then(res => [...new Set(res.map(c => c.centerId))]);
      
      whereClause.id = { [Op.in]: mappedCenterIds };
    }

    const centers = await Department.findAll({
      where: whereClause,
      include: [
        { model: User, as: 'referringBDE', attributes: ['name', 'uid'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(centers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch center audit ledger' });
  }
});

router.put('/centers/:id/audit', verifyToken, isOpsOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason, infrastructureDetails, programIds } = req.body;

    const center = await Department.findByPk(id);
    if (!center || !['partner-center', 'partner centers'].includes(center.type)) {
      return res.status(404).json({ error: 'Study center not found' });
    }

    // Institutional Audit Stage 1: Academic/Operations
    // Transition to PENDING_FINANCE if approved by Ops
    const nextAuditStatus = status === 'approved' ? 'PENDING_FINANCE' : 'rejected';

    await center.update({
      auditStatus: nextAuditStatus,
      rejectionReason: status === 'rejected' ? reason : null,
      infrastructureDetails: infrastructureDetails || center.infrastructureDetails,
      status: 'inactive', // Remains inactive until Finance Approval
    });

    if (status === 'approved' && center.bdeId) {
        await Notification.create({
            userUid: center.bdeId,
            type: 'info',
            message: `Institutional Audit: Center "${center.name}" has been verified by Academic Operations and forwarded to Finance for final clearance.`,
            link: '/dashboard/sales/referrals'
        });
    }

    // Notify Finance Admins of new center awaiting ratification
    if (status === 'approved') {
        try {
            const financeAdmins = await User.findAll({
                where: { 
                    role: { 
                        [Op.in]: ['Finance Admin', 'Organization Admin'] 
                    } 
                }
            });

            for (const admin of financeAdmins) {
                await Notification.create({
                    userUid: admin.uid,
                    type: 'info',
                    message: `New Center Pending Verification: "${center.name}" has been cleared by Operations and requires finance ratification.`,
                    link: '/dashboard/finance/center-verification?tab=pending'
                });
            }
        } catch (notifyError) {
            console.error('[FINANCE_NOTIFY_ERROR]:', notifyError);
            // Non-blocking
        }
    }

    if (status === 'approved' && programIds && Array.isArray(programIds)) {
        for (const progId of programIds) {
            const program = await Program.findByPk(progId);
            if (program) {
                await CenterProgram.findOrCreate({
                    where: { centerId: center.id, programId: program.id },
                    defaults: { subDeptId: program.subDeptId || 1, isActive: true }
                });
            }
        }
    }

    res.json({ message: `Center audit ${status} successfully and jurisdictional boundaries synchronized.`, center });
  } catch (error) {
    res.status(500).json({ error: 'Audit protocol failure' });
  }
});

// ==========================================
// SYLLABUS MANAGEMENT
// ==========================================

async function recalculateSyllabusStatus(programId) {
  try {
    const program = await Program.findByPk(programId);
    if (!program) return;

    // Only transition to 'staged' if it's currently 'draft'
    if (program.status !== 'draft' && program.status !== 'staged') return;

    const subjects = await Subject.findAll({ where: { programId } });
    const currentCredits = subjects.reduce((sum, s) => sum + (s.credits || 0), 0);
    
    const isThresholdMet = currentCredits >= (program.totalCredits || 0) && currentCredits > 0;
    const newStatus = isThresholdMet ? 'staged' : 'draft';

    await program.update({ status: newStatus });
  } catch (error) {
    console.error('[SYLLABUS SYNC ERROR]:', error);
  }
}

router.post('/subjects', verifyToken, isOpsOrAdmin, async (req, res) => {
  try {
    const subject = await Subject.create(req.body);
    await recalculateSyllabusStatus(req.body.programId);
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
    const subject = await Subject.findByPk(id);
    if (!subject) return res.status(404).json({ error: 'Subject not found' });
    
    const programId = subject.programId;
    
    // Manual Cascade for stabilization
    await Module.destroy({ where: { subjectId: id } });
    await subject.destroy();
    
    await recalculateSyllabusStatus(programId);
    
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
    const isSubDeptAdmin = ['SUB_DEPT_ADMIN', 'Open School Admin', 'Online Department Admin', 'Skill Department Admin', 'BVoc Department Admin'].includes(req.user.role);
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
      const subDeptKeys = ['Open School Admin', 'Online Department Admin', 'Skill Department Admin', 'BVoc Department Admin'];

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
       type: { [Op.in]: ['partner-center', 'partner centers'] } 
    };
    const isSubDeptAdmin = ['SUB_DEPT_ADMIN', 'Open School Admin', 'Online Department Admin', 'Skill Department Admin', 'BVoc Department Admin', 'Openschool', 'Online', 'Skill', 'Bvoc'].includes(req.user.role);
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
    const isSubDeptAdmin = ['SUB_DEPT_ADMIN', 'Open School Admin', 'Online Department Admin', 'Skill Department Admin', 'BVoc Department Admin'].includes(req.user.role);
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
