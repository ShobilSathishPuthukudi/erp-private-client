import express from 'express';
import { models, sequelize } from '../models/index.js';
import {
  getSubDepartmentNameAliases,
  normalizeInstitutionRoleName,
  normalizeSubDepartmentName,
} from '../config/institutionalStructure.js';
import { verifyToken, isOpsOrAdmin } from '../middleware/verifyToken.js';
import { Op } from 'sequelize';
import bcrypt from 'bcryptjs';
import { syncProgramLifecycle } from '../utils/academicLifecycle.js';
import { clearNotifications } from './notifications.js';

const router = express.Router();
const { Department, Student, Program, Subject, Module, User, Payment, CenterSubDept, AdmissionSession, AuditLog, CenterProgram, Notification, Lead } = models;

const LEGACY_SUB_DEPARTMENT_IDS = {
  'Open School': 8,
  'Online': 9,
  'Skill': 10,
  'BVoc': 11,
};

const CANONICAL_SUB_DEPARTMENTS = ['Open School', 'Online', 'Skill', 'BVoc'];
const RESTRICTED_UNIT_ROLES = ['open school admin', 'online admin', 'skill admin', 'bvoc admin'];

const getLegacySubDeptId = (user) => {
  if (!user) return null;
  const unitStr = (user.subDepartment || user.role || '').toLowerCase();
  if (unitStr.includes('open school')) return 8;
  if (unitStr.includes('online')) return 9;
  if (unitStr.includes('skill')) return 10;
  if (unitStr.includes('bvoc')) return 11;
  return null;
};

const getSubDeptId = (user) => {
  if (!user) return null;
  if (user.deptId || user.departmentId) return user.deptId || user.departmentId;
  return getLegacySubDeptId(user);
};

const getSubDeptScopeIds = (user) => {
  const ids = [];
  const primaryId = getSubDeptId(user);
  const legacyId = getLegacySubDeptId(user);

  [primaryId, legacyId]
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0)
    .forEach((value) => {
      if (!ids.includes(value)) ids.push(value);
    });

  return ids;
};

const resolveSubDepartmentScopeIds = async (identifier) => {
  if (identifier === null || identifier === undefined || identifier === '') return [];

  const numericId = Number(identifier);
  const ids = [];
  let canonicalName = null;

  if (Number.isInteger(numericId) && numericId > 0) {
    ids.push(numericId);
    const department = await Department.findByPk(numericId, { attributes: ['id', 'name'] });
    if (department?.name) {
      canonicalName = normalizeSubDepartmentName(department.name);
    }
  } else {
    canonicalName = normalizeSubDepartmentName(String(identifier));
  }

  if (canonicalName && LEGACY_SUB_DEPARTMENT_IDS[canonicalName]) {
    ids.push(LEGACY_SUB_DEPARTMENT_IDS[canonicalName]);

    const aliases = getSubDepartmentNameAliases(canonicalName);
    const matchingDepartments = await Department.findAll({
      where: { name: { [Op.in]: aliases } },
      attributes: ['id'],
      raw: true
    });

    matchingDepartments.forEach(({ id }) => {
      if (Number.isInteger(id) && id > 0) ids.push(id);
    });
  }

  return [...new Set(ids)];
};

// ==========================================
// CENTER AUDIT SYSTEM
// ==========================================

router.get('/centers/audit-list', verifyToken, isOpsOrAdmin, async (req, res) => {
  try {
    const { status } = req.query; // pending | approved | rejected
    const normalizedRole = normalizeInstitutionRoleName(req.user.role || '').toLowerCase().trim();
    
    let queryAuditStatus = status || 'pending';
    if (status === 'finance_pending') {
      queryAuditStatus = 'PENDING_FINANCE';
    } else if (status === 'approved') {
      queryAuditStatus = 'approved';
    }

    const whereClause = {
      type: { [Op.in]: ['partner-center', 'partner center', 'partner centers', 'study-center', 'Study centers', 'study centers'] },
      auditStatus: queryAuditStatus
    };
    
    // Isolation: only specialized unit admins should be constrained to their sub-department scope.
    const scopeIds = getSubDeptScopeIds(req.user);
    if (RESTRICTED_UNIT_ROLES.includes(normalizedRole) && scopeIds.length > 0) {
      const sqlScope = scopeIds.join(',');
      // 1. Existing mappings (Approved centers already operational in the unit)
      const mappedCenterIds = await CenterProgram.findAll({
        where: { subDeptId: { [Op.in]: scopeIds }, isActive: true },
        attributes: ['centerId']
      }).then(res => [...new Set(res.map(c => c.centerId))]);
      
      // 2. Interest-based discovery (Proposed/Approved centers seeking entry into this unit)
      const unitPrograms = await Program.findAll({ where: { subDeptId: { [Op.in]: scopeIds } }, attributes: ['id'] });
      const unitProgIds = unitPrograms.map(p => p.id);

      whereClause[Op.or] = [
        { id: { [Op.in]: mappedCenterIds } },
        sequelize.literal(`(
          EXISTS(
            SELECT 1 FROM departments d2 
            WHERE d2.id = department.id 
            AND d2.auditStatus = '${queryAuditStatus}' 
            AND d2.type IN ('partner-center', 'partner center', 'partner centers', 'study-center', 'Study centers', 'study centers')
            AND JSON_OVERLAPS(d2.metadata->'$.primaryInterest.programIds', CAST('[${unitProgIds.join(',') || 0}]' AS JSON))
          )
        )`)
      ];
    }

    const centers = await Department.findAll({
      where: whereClause,
      attributes: { include: ['rejectionReason', 'financeRemarks'] },
      include: [
        { model: User, as: 'referringBDE', attributes: ['name', 'uid'], required: false },
        {
          model: CenterProgram,
          as: 'mappedPrograms',
          required: false,
          include: [{ model: Program, attributes: ['id', 'name', 'type'] }]
        },
        {
          model: Lead,
          as: 'sourceLead',
          attributes: ['id', 'employeeId', 'bdeId'],
          required: false,
          include: [
            { model: User, as: 'employee', attributes: ['name', 'uid', 'role'], required: false },
            { model: User, as: 'referrer', attributes: ['name', 'uid', 'role'], required: false }
          ]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Normalize: if department.bdeId is null, fall back to the source lead's employee/BDE
    const normalized = centers.map(c => {
      const plain = c.toJSON();
      if (!plain.referringBDE) {
        const lead = plain.sourceLead;
        plain.referringBDE = lead?.employee || lead?.referrer || null;
      }
      return plain;
    });

    res.json(normalized);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch center audit ledger' });
  }
});

router.put('/centers/:id/audit', verifyToken, isOpsOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason, infrastructureDetails, programIds, password } = req.body;

    const center = await Department.findByPk(id);
    if (!center || !['partner-center', 'partner center', 'partner centers', 'study-center'].includes(center.type)) {
      return res.status(404).json({ error: 'Study center not found' });
    }

    const opsNotificationRoles = [
      'Academic Operations',
      'Academic Operations Admin',
      'Academic Operations Administrator',
      'Operations Admin',
      'Operations Administrator',
      'Organization Admin',
      'academic operations admin',
      'operations admin',
      'organization admin'
    ];
    const opsRecipients = await User.findAll({
      where: {
        role: { [Op.in]: opsNotificationRoles },
        status: 'active'
      },
      attributes: ['uid']
    });

    // Institutional Audit Stage 1: Academic/Operations
    // Transition to PENDING_FINANCE if approved by Ops
    const nextAuditStatus = status === 'approved' ? 'PENDING_FINANCE' : 'rejected';

    await center.update({
      auditStatus: nextAuditStatus,
      rejectionReason: reason || center.rejectionReason,
      infrastructureDetails: infrastructureDetails || center.infrastructureDetails,
      status: status === 'approved' ? 'draft' : 'inactive', // Transition to Draft upon Ops clearance
    });

    // Update Center Admin credentials if password provisioned
    if (status === 'approved' && password && center.adminId) {
      const adminUser = await User.findOne({ where: { uid: center.adminId } });
      if (adminUser) {
        const hashedPassword = await bcrypt.hash(password, 10);
        await adminUser.update({ 
          password: hashedPassword, 
          devPassword: password 
        });
      }
    }

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

    // Explicit Governance Log
    await AuditLog.create({
        userId: req.user.uid,
        entity: 'Department',
        action: status === 'approved' ? 'OPS_VERIFIED' : 'OPS_REJECTED',
        module: 'Academic Operations',
        remarks: reason,
        before: { auditStatus: center._previousDataValues.auditStatus },
        after: { 
            id: center.id,
            name: center.name,
            auditStatus: nextAuditStatus,
            remarks: reason
        },
        timestamp: new Date()
    });

    await center.reload({
        attributes: { include: ['rejectionReason'] },
        include: [
            { model: User, as: 'referringBDE', attributes: ['name', 'uid'] },
            { 
                model: CenterProgram, 
                as: 'mappedPrograms',
                include: [{ model: Program, attributes: ['id', 'name', 'type'] }]
            }
        ]
    });

    await clearNotifications({
      userUids: opsRecipients.map((user) => user.uid),
      links: ['/dashboard/operations/center-audit?tab=pending'],
      messagePatterns: [
        `%${center.name}%requires audit%`,
        `%New Center Pending Verification%${center.name}%`
      ]
    });

    res.json({ message: `Center audit ${status} successfully and jurisdictional boundaries synchronized.`, center });
  } catch (error) {
    res.status(500).json({ error: 'Audit protocol failure' });
  }
});

// GET /operations/centers/:id/audit-history
router.get('/centers/:id/audit-history', verifyToken, isOpsOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const logs = await AuditLog.findAll({
      where: {
        entity: 'Department',
        [Op.or]: [
          { 'after.id': Number(id) },
          { remarks: { [Op.like]: `%ID: ${id}%` } }, // Fallback for some log formats
          { module: 'Academic Operations' } // We will filter further in memory or use JSON operator
        ]
      },
      order: [['timestamp', 'DESC']],
      limit: 20
    });

    // Precision filter for JSON after.id
    const filteredLogs = logs.filter(log => {
        try {
            const after = typeof log.after === 'string' ? JSON.parse(log.after) : log.after;
            return after?.id === Number(id);
        } catch (e) {
            return false;
        }
    });

    res.json(filteredLogs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch institutional history' });
  }
});

// ==========================================
// SYLLABUS MANAGEMENT
// ==========================================

async function recalculateSyllabusStatus(programId) {
  try {
    await syncProgramLifecycle(programId);
  } catch (error) {
    console.error('[SYLLABUS SYNC ERROR]:', error);
  }
}

router.post('/subjects', verifyToken, isOpsOrAdmin, async (req, res) => {
  try {
    const { programId } = req.body;
    const program = await Program.findByPk(programId);
    if (program && program.status === 'active') {
      return res.status(400).json({ 
        error: 'Governance Restriction: Curriculum is locked for active programs.' 
      });
    }

    const subject = await Subject.create(req.body);
    await recalculateSyllabusStatus(programId);
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
    const program = await Program.findByPk(programId);
    if (program && program.status === 'active') {
      return res.status(400).json({ 
        error: 'Governance Restriction: Active program curriculum cannot be modified.' 
      });
    }
    
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

    await syncProgramLifecycle(program.id);
    await program.reload();

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
    const isSubDeptAdmin = ['SUB_DEPT_ADMIN', 'Open School Admin', 'Online Admin', 'Skill Admin', 'BVoc Admin'].includes(normalizeInstitutionRoleName(req.user.role));
    const subDeptScopeIds = isSubDeptAdmin ? getSubDeptScopeIds(req.user) : [];
    const requestedScopeIds = !isSubDeptAdmin ? await resolveSubDepartmentScopeIds(querySubDeptId) : [];
    
    // Base stats
    const whereClause = isSubDeptAdmin
      ? (subDeptScopeIds.length > 0 ? { subDepartmentId: { [Op.in]: subDeptScopeIds } } : {})
      : (requestedScopeIds.length > 0 ? { subDepartmentId: { [Op.in]: requestedScopeIds } } : {});

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

    // Scoped Institutional Totals (Jurisdictional Telemetry)
    const subDeptFilter = isSubDeptAdmin 
      ? (subDeptScopeIds.length > 0 ? { subDeptId: { [Op.in]: subDeptScopeIds } } : {})
      : (requestedScopeIds.length > 0 ? { subDeptId: { [Op.in]: requestedScopeIds } } : {});

    const [totalUniversities, activePrograms] = await Promise.all([
      Program.count({ 
        distinct: true,
        col: 'universityId',
        where: subDeptFilter
      }),
      Program.count({ 
        where: { 
          ...subDeptFilter,
          status: { [Op.in]: ['active', 'staged'] } 
        } 
      })
    ]);

    // Global Institutional Totals for Centers (Metric Globalization)
    const totalActiveCenters = await Department.count({ 
      where: { 
        type: { [Op.in]: ['partner-center', 'partner center', 'partner centers', 'study-center', 'Study centers', 'study centers'] }, 
        status: 'active', 
        auditStatus: 'approved' 
      } 
    });
    
    const stats = {
      totalStudents,
      pendingReviews,
      totalActiveCenters,
      totalUniversities,
      activePrograms,
      totalActivePrograms: activePrograms,
      approvalRate: totalStudents > 0 ? (((totalStudents - rejections) / totalStudents) * 100).toFixed(1) : 0,
      rejectionRate: totalStudents > 0 ? ((rejections / totalStudents) * 100).toFixed(1) : 0,
      statusDistribution: statusData.map(s => ({ name: s.status, value: parseInt(s.count) }))
    };

    // If Ops Admin, add breakdown
    if (!isSubDeptAdmin) {
      const breakdown = await Promise.all(CANONICAL_SUB_DEPARTMENTS.map(async (name) => {
        const scopeIds = await resolveSubDepartmentScopeIds(name);
        const studentWhere = scopeIds.length > 0 ? { subDepartmentId: { [Op.in]: scopeIds } } : { id: null };
        const subDeptWhere = scopeIds.length > 0 ? { subDeptId: { [Op.in]: scopeIds } } : { id: null };
        
        const [studentCount, batchCount, centerCount, programCount, pendingCount, rejectedCount] = await Promise.all([
          Student.count({ where: studentWhere }),
          AdmissionSession.count({ where: subDeptWhere }),
          CenterProgram.count({
            where: subDeptWhere,
            distinct: true,
            col: 'centerId',
            include: [{
              model: Department,
              as: 'center',
              where: { status: 'active', auditStatus: 'approved' }
            }]
          }),
          Program.count({ where: subDeptWhere }),
          Student.count({ where: { ...studentWhere, status: 'PENDING_REVIEW' } }),
          Student.count({ where: { ...studentWhere, status: 'REJECTED' } })
        ]);

        return {
          id: scopeIds[0] || LEGACY_SUB_DEPARTMENT_IDS[name],
          name,
          studentCount,
          batchCount,
          centerCount,
          programCount,
          pendingReviews: pendingCount,
          approvalRate: studentCount > 0
            ? `${(((studentCount - rejectedCount) / studentCount) * 100).toFixed(1)}%`
            : '0%'
        };
      }));
      stats.unitBreakdown = breakdown;
    }

    // Admission Velocity Trend — daily bucketing when ?range=30|90, otherwise 6-month monthly.
    const rangeDays = [30, 90].includes(parseInt(req.query.range)) ? parseInt(req.query.range) : null;

    if (rangeDays) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (rangeDays - 1));
      startDate.setHours(0, 0, 0, 0);

      const admissionsByDay = await Student.findAll({
        where: {
          ...whereClause,
          createdAt: { [Op.gte]: startDate }
        },
        attributes: [
          [sequelize.fn('DATE', sequelize.col('createdAt')), 'day'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: [sequelize.fn('DATE', sequelize.col('createdAt'))],
        raw: true
      });

      const toKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const countByKey = new Map(admissionsByDay.map((row) => {
        const key = row.day instanceof Date ? toKey(row.day) : String(row.day).slice(0, 10);
        return [key, parseInt(row.count)];
      }));

      const days = [];
      for (let i = rangeDays - 1; i >= 0; i--) {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - i);
        days.push({
          month: d.toLocaleString('default', { month: 'short', day: '2-digit' }),
          count: countByKey.get(toKey(d)) || 0
        });
      }
      stats.trend = days;
    } else {
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
    }

    // Recent Academic Actions (Audit Logs)
    const recentLogs = await AuditLog.findAll({
      limit: 5,
      order: [['timestamp', 'DESC']],
      include: [{ model: User, as: 'user', attributes: ['name', 'role'] }]
    });
    stats.recentActions = recentLogs;

    // Global Batch Count
    const totalBatches = await AdmissionSession.count({
      where: isSubDeptAdmin
        ? (subDeptScopeIds.length > 0 ? { subDeptId: { [Op.in]: subDeptScopeIds } } : {})
        : (requestedScopeIds.length > 0 ? { subDeptId: { [Op.in]: requestedScopeIds } } : {})
    });
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
       type: { [Op.in]: ['partner-center', 'partner center', 'partner centers', 'study-center', 'Study centers', 'study centers'] } 
    };
    const isSubDeptAdmin = ['SUB_DEPT_ADMIN', 'Open School Admin', 'Online Admin', 'Skill Admin', 'BVoc Admin', 'Openschool', 'Online', 'Skill', 'Bvoc'].includes(normalizeInstitutionRoleName(req.user.role));
    const scopeIds = isSubDeptAdmin ? getSubDeptScopeIds(req.user) : [];
    const effectiveIds = isSubDeptAdmin ? scopeIds : await resolveSubDepartmentScopeIds(querySubDeptId);
    const sqlScope = effectiveIds.length > 0 ? effectiveIds.join(',') : '';

    if (effectiveIds.length > 0) {
      whereClause.id = {
        [Op.in]: sequelize.literal(`(SELECT DISTINCT centerId FROM center_programs WHERE subDeptId IN (${sqlScope}) AND isActive = true)`)
      };
    }

    const centers = await Department.findAll({
      where: whereClause,
      attributes: [
        'id', 'name', 'status', 'shortName',
        [sequelize.literal(`(SELECT COUNT(*) FROM students WHERE students.centerId = department.id ${effectiveIds.length > 0 ? `AND students.subDepartmentId IN (${sqlScope})` : ''})`), 'studentCount'],
        [sequelize.literal(`(SELECT COUNT(*) FROM students WHERE students.centerId = department.id AND students.status = 'REJECTED' ${effectiveIds.length > 0 ? `AND students.subDepartmentId IN (${sqlScope})` : ''})`), 'rejectedCount'],
        [sequelize.literal(`(SELECT COUNT(*) FROM students WHERE students.centerId = department.id AND students.createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY) ${effectiveIds.length > 0 ? `AND students.subDepartmentId IN (${sqlScope})` : ''})`), 'velocity'],
        [sequelize.literal(`(SELECT COUNT(*) FROM students WHERE students.centerId = department.id AND students.attemptCount > 1 ${effectiveIds.length > 0 ? `AND students.subDepartmentId IN (${sqlScope})` : ''})`), 'reAttemptCount'],
        [sequelize.literal(`(SELECT AVG(TIMESTAMPDIFF(HOUR, students.createdAt, students.reviewedAt)) FROM students WHERE students.centerId = department.id AND students.reviewedAt IS NOT NULL ${effectiveIds.length > 0 ? `AND students.subDepartmentId IN (${sqlScope})` : ''})`), 'avgReviewTime'],
        [sequelize.literal(`(SELECT COUNT(*) FROM center_programs WHERE center_programs.centerId = department.id AND center_programs.isActive = true ${effectiveIds.length > 0 ? `AND center_programs.subDeptId IN (${sqlScope})` : ''})`), 'activePrograms']
      ]
    });
    res.json(centers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to aggregate performance data' });
  }
});

router.get('/performance/centers/:id/details', verifyToken, isOpsOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { subDeptId: querySubDeptId } = req.query;
    const isSubDeptAdmin = ['SUB_DEPT_ADMIN', 'Open School Admin', 'Online Admin', 'Skill Admin', 'BVoc Admin', 'Openschool', 'Online', 'Skill', 'Bvoc'].includes(normalizeInstitutionRoleName(req.user.role));
    const scopeIds = isSubDeptAdmin ? getSubDeptScopeIds(req.user) : [];
    const effectiveIds = isSubDeptAdmin ? scopeIds : await resolveSubDepartmentScopeIds(querySubDeptId);

    const center = await Department.findOne({
      where: { id, type: { [Op.in]: ['partner-center', 'partner center', 'partner centers', 'study-center', 'Study centers', 'study centers'] } },
      attributes: ['id', 'name', 'status', 'email', 'phone', 'address', 'city', 'state']
    });

    if (!center) return res.status(404).json({ error: 'Center not found' });

    const mappings = await CenterProgram.findAll({
      where: { 
        centerId: id,
        isActive: true,
        ...(effectiveIds.length > 0 ? { subDeptId: { [Op.in]: effectiveIds } } : {})
      },
      include: [
        { 
          model: Program, 
          attributes: ['id', 'name', 'shortName'],
          include: [{ model: Department, as: 'university', attributes: ['id', 'name'] }]
        }
      ]
    });

    res.json({ center, mappings });
  } catch (error) {
    console.error('Center details error:', error);
    res.status(500).json({ error: 'Failed to fetch center forensic details' });
  }
});

// ==========================================
// ADMISSION PIPELINE
// ==========================================

router.get('/pipeline', verifyToken, isOpsOrAdmin, async (req, res) => {
  try {
    const isSubDeptAdmin = ['SUB_DEPT_ADMIN', 'Open School Admin', 'Online Admin', 'Skill Admin', 'BVoc Admin'].includes(normalizeInstitutionRoleName(req.user.role));
    const scopeIds = getSubDeptScopeIds(req.user);
    const whereClause = isSubDeptAdmin && scopeIds.length > 0 ? { subDepartmentId: { [Op.in]: scopeIds } } : {};

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

    const subDeptRecords = await Department.findAll({
      where: { type: 'sub-departments' },
      attributes: ['id', 'name'],
      order: [['id', 'ASC']]
    });

    const subDepartments = subDeptRecords
      .map(sd => {
        const canonicalName = normalizeSubDepartmentName(sd.name) || sd.name;
        const legacyId = LEGACY_SUB_DEPARTMENT_IDS[canonicalName];
        const matchingIds = [sd.id];
        if (legacyId && !matchingIds.includes(legacyId)) matchingIds.push(legacyId);
        return { id: sd.id, name: canonicalName, matchingIds };
      })
      .filter(sd => !isSubDeptAdmin || scopeIds.length === 0 || scopeIds.includes(sd.id));

    res.json({ stats, subDepartments });
  } catch (error) {
    console.error('Pipeline error:', error);
    res.status(500).json({ error: 'Pipeline visualizer failed' });
  }
});

router.get('/pipeline/details', verifyToken, isOpsOrAdmin, async (req, res) => {
  try {
    const { reviewStage, enrollStatus, subDepartmentId } = req.query;
    const isSubDeptAdmin = ['SUB_DEPT_ADMIN', 'Open School Admin', 'Online Admin', 'Skill Admin', 'BVoc Admin'].includes(normalizeInstitutionRoleName(req.user.role));
    const adminScopeIds = getSubDeptScopeIds(req.user);

    const whereClause = {};
    if (reviewStage) whereClause.reviewStage = reviewStage;
    
    if (enrollStatus) {
      if (enrollStatus === 'enrolled') {
        whereClause[Op.or] = [
          { enrollStatus: 'enrolled' },
          { enrollStatus: 'active' },
          { status: 'ENROLLED' }
        ];
      } else if (enrollStatus === 'rejected') {
        whereClause[Op.or] = [
          { enrollStatus: 'rejected' },
          { status: 'REJECTED' }
        ];
      } else {
        whereClause.enrollStatus = enrollStatus;
      }
    }
    
    // Authorization & Filter Logic
    if (isSubDeptAdmin && adminScopeIds.length > 0) {
      whereClause.subDepartmentId = { [Op.in]: adminScopeIds };
    } else if (subDepartmentId && subDepartmentId !== 'all') {
      whereClause.subDepartmentId = subDepartmentId;
    }

    const students = await Student.findAll({
      where: whereClause,
      attributes: ['id', 'name', 'email', 'status', 'reviewStage', 'enrollStatus'],
      include: [
        {
          model: Program,
          attributes: ['name', 'shortName'],
          include: [
             { model: Department, as: 'university', attributes: ['name', 'shortName'] }
          ]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json(students);
  } catch (error) {
    console.error('[PIPELINE_DETAILS_ERROR]:', error);
    res.status(500).json({ error: 'Failed to synchronize pipeline drill-down' });
  }
});

export default router;
