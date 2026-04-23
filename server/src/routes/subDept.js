import express from 'express';
import { models, sequelize } from '../models/index.js';
import { Op } from 'sequelize';
import { verifyToken } from '../middleware/verifyToken.js';
import erpEvents from '../lib/events.js';
import { normalizeInstitutionRoleName } from '../config/institutionalStructure.js';

const router = express.Router();
const { Program, Student, Department, AccreditationRequest, ProgramOffering, Payment, Notification, User } = models;

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
  const canonicalRole = normalizeInstitutionRoleName(user.role || '');
  // Administrative roles bypass jurisdictional filtering
  const adminRoles = ['Academic Operations Admin', 'Organization Admin'];
  if (adminRoles.includes(canonicalRole)) return null;
  if (user.deptId || user.departmentId) return user.deptId || user.departmentId;
  return getLegacySubDeptId(user);
};

const getSubDeptScopeIds = (user) => {
  const ids = [];
  const canonicalRole = normalizeInstitutionRoleName(user?.role || '');
  const adminRoles = ['Academic Operations Admin', 'Organization Admin'];
  if (adminRoles.includes(canonicalRole)) return ids;

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

const isSubDeptAdmin = (req, res, next) => {
  const canonicalRole = normalizeInstitutionRoleName(req.user.role || '');
  const deptId = getSubDeptId(req.user);
  
  // Normalized whitelists for robust comparison
  const adminRoles = ['Academic Operations Admin', 'Organization Admin'];
  const unitAdminRoles = ['Open School Admin', 'Online Admin', 'Skill Admin', 'BVoc Admin', 'SUB_DEPT_ADMIN'];
  const allowedRoles = [...adminRoles, ...unitAdminRoles];
  
  if (!allowedRoles.includes(canonicalRole)) {
    return res.status(403).json({ error: 'Access denied: Insufficient privileges' });
  }

  // Academic/Operations admins can bypass deptId requirement
  if (adminRoles.includes(canonicalRole) && !deptId) {
    return next();
  }

  if (!deptId) {
    return res.status(403).json({ error: 'Access denied: Must have an assigned department' });
  }

  // Normalize deptId for jurisdictional queries
  req.user.deptId = deptId;
  next();
};

// --- Telemetry & Dashboard Stats ---
router.get('/stats', verifyToken, isSubDeptAdmin, async (req, res) => {
  try {
    const deptIds = getSubDeptScopeIds(req.user);
    const programScope = deptIds.length > 0 ? { subDeptId: { [Op.in]: deptIds } } : {};
    const studentScopeInclude = { model: Program, where: programScope, attributes: [] };
    const studentScopeWhere = deptIds.length > 0 ? { subDepartmentId: { [Op.in]: deptIds } } : {};

    // 1. Jurisdictional Program Count
    const totalPrograms = await Program.count({ 
      where: programScope
    });
    
    // 2. Jurisdictional Student Count
    const totalStudents = await Student.count({
      include: [
        studentScopeInclude
      ]
    });
    
    // 3. Pending Verifications
    const pendingVerifications = await Student.count({
      where: { enrollStatus: 'pending_subdept', ...studentScopeWhere },
      include: [
        studentScopeInclude
      ]
    });
    
    // 4. Jurisdictional Revenue
    const payments = await Payment.findAll({
      include: [
        { 
          model: Student, 
          attributes: [],
          include: [studentScopeInclude]
        }
      ],
      attributes: [[sequelize.fn('SUM', sequelize.col('amount')), 'total']],
      raw: true
    });
    const revenue = payments[0]?.total || 0;

    res.json({
      totalPrograms,
      totalStudents,
      pendingVerifications,
      revenue
    });
  } catch (error) {
    console.error('Sub-dept stats error:', error);
    res.status(500).json({ error: 'Failed to aggregate jurisdictional telemetry' });
  }
});

// --- Programs Management ---
router.get('/programs', verifyToken, isSubDeptAdmin, async (req, res) => {
  try {
    const { subDeptId: querySubDeptId } = req.query;
    const deptId = querySubDeptId || req.user.deptId;
    const isGlobal = (['Academic Operations Admin', 'Organization Admin'].includes(normalizeInstitutionRoleName(req.user.role || '')) && !querySubDeptId);
    const deptIds = getSubDeptScopeIds(req.user);
    
    const programs = await Program.findAll({
      where: isGlobal ? {} : (querySubDeptId ? { subDeptId: querySubDeptId } : (deptIds.length > 0 ? { subDeptId: { [Op.in]: deptIds } } : { subDeptId: deptId })),
      include: [
        { model: Department, as: 'university', attributes: ['id', 'name'] },
        { model: ProgramOffering, as: 'offeringCenters', attributes: ['id'] }
      ]
    });
    res.json(programs);
  } catch (error) {
    console.error('Fetch sub-dept programs error:', error);
    res.status(500).json({ error: 'Failed to fetch programs' });
  }
});

router.put('/programs/:id/status', verifyToken, isSubDeptAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'active' or 'open'
    const deptIds = getSubDeptScopeIds(req.user);

    const program = await Program.findOne({ 
      where: { 
        id, 
        ...(deptIds.length > 0 ? { subDeptId: { [Op.in]: deptIds } } : {}) 
      } 
    });
    if (!program) return res.status(404).json({ error: 'Program not found or access denied' });

    if (status === 'open' && program.status !== 'active') {
      return res.status(400).json({ error: 'Program must be Active (fee defined) before it can be marked Open for admissions' });
    }

    await program.update({ status });

    res.json({ message: `Program status updated to ${status}`, program });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update program status' });
  }
});

// --- Students Management ---
router.get('/students', verifyToken, isSubDeptAdmin, async (req, res) => {
  try {
    // We fetch students that belong to programs under this subDeptId
    const isGlobal = ['Academic Operations Admin', 'Organization Admin'].includes(normalizeInstitutionRoleName(req.user.role || ''));
    const deptIds = getSubDeptScopeIds(req.user);
    const students = await Student.findAll({
      include: [
        { 
          model: Program, 
          where: isGlobal ? {} : (deptIds.length > 0 ? { subDeptId: { [Op.in]: deptIds } } : { subDeptId: req.user.deptId }),
          attributes: ['id', 'name', 'duration']
        },
        {
          model: Department, // Study center
          attributes: ['id', 'name']
        }
      ]
    });
    res.json(students);
  } catch (error) {
    console.error('Fetch sub-dept students error:', error);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

router.put('/students/:id/verify-documents', verifyToken, isSubDeptAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;
    const deptIds = getSubDeptScopeIds(req.user);

    const student = await Student.findOne({
      where: { id },
      include: [{ model: Program, where: deptIds.length > 0 ? { subDeptId: { [Op.in]: deptIds } } : {} }]
    });

    if (!student) return res.status(404).json({ error: 'Student not found in your jurisdictional queue' });

    if (!['pending_ops', 'pending_subdept'].includes(student.enrollStatus)) {
      return res.status(400).json({ error: 'Student is not in sub-department verification phase' });
    }

    const nextStatus = status === 'approved' ? 'pending_finance' : 'rejected_subdept';
    
    const logs = student.verificationLogs || [];
    logs.push({ step: 'Sub-Department', time: new Date(), status, by: req.user.uid, remarks });

    await student.update({
      enrollStatus: nextStatus,
      verificationLogs: logs,
      remarks: remarks || student.remarks
    });

    res.json({ message: `Document verification ${status} successfully`, student });
  } catch (error) {
    res.status(500).json({ error: 'Verification protocol failed' });
  }
});

// --- Student Validation Workflow (Phase 2) ---
router.get('/students/counts', verifyToken, isSubDeptAdmin, async (req, res) => {
  try {
    const deptIds = getSubDeptScopeIds(req.user);
    const subDeptFilter = deptIds.length > 0 ? { subDeptId: { [Op.in]: deptIds } } : {};

    const [pending, validated, approved, rejected] = await Promise.all([
      Student.count({
        where: { status: 'PENDING_REVIEW', reviewStage: 'SUB_DEPT' },
        include: [{ model: Program, where: subDeptFilter, attributes: [] }]
      }),
      Student.count({
        where: { status: { [Op.in]: ['OPS_APPROVED', 'FINANCE_PENDING', 'PAYMENT_VERIFIED'] } },
        include: [{ model: Program, where: subDeptFilter, attributes: [] }]
      }),
      Student.count({
        where: { status: { [Op.in]: ['FINANCE_APPROVED', 'ACTIVE', 'ENROLLED'] } },
        include: [{ model: Program, where: subDeptFilter, attributes: [] }]
      }),
      Student.count({
        where: { status: 'REJECTED' },
        include: [{ model: Program, where: subDeptFilter, attributes: [] }]
      })
    ]);

    res.json({ pending, validated, approved, rejected });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch student validation counts' });
  }
});

router.get('/students/pending', verifyToken, isSubDeptAdmin, async (req, res) => {
  try {
    const deptIds = getSubDeptScopeIds(req.user);
    const students = await Student.findAll({
      where: {
        status: 'PENDING_REVIEW',
        reviewStage: 'SUB_DEPT'
      },
      include: [
        { model: Program, where: deptIds.length > 0 ? { subDeptId: { [Op.in]: deptIds } } : {}, attributes: ['id', 'name'] },
        { model: Department, as: 'center', attributes: ['id', 'name'] }
      ]
    });
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pending validation queue' });
  }
});

router.get('/students/validated', verifyToken, isSubDeptAdmin, async (req, res) => {
  try {
    const deptIds = getSubDeptScopeIds(req.user);
    const students = await Student.findAll({
      where: { 
        status: { 
          [Op.in]: ['OPS_APPROVED', 'FINANCE_PENDING', 'PAYMENT_VERIFIED'] 
        } 
      },
      include: [
        { model: Program, where: deptIds.length > 0 ? { subDeptId: { [Op.in]: deptIds } } : {}, attributes: ['id', 'name'] },
        { model: Department, as: 'center', attributes: ['id', 'name'] }
      ]
    });
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch validated student queue' });
  }
});

router.get('/students/approved', verifyToken, isSubDeptAdmin, async (req, res) => {
  try {
    const deptIds = getSubDeptScopeIds(req.user);
    const students = await Student.findAll({
      where: { 
        status: { 
          [Op.in]: ['FINANCE_APPROVED', 'ACTIVE', 'ENROLLED'] 
        } 
      },
      include: [
        { model: Program, where: deptIds.length > 0 ? { subDeptId: { [Op.in]: deptIds } } : {}, attributes: ['id', 'name'] },
        { model: Department, as: 'center', attributes: ['id', 'name'] }
      ]
    });
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch approved student archive' });
  }
});

router.get('/students/rejected', verifyToken, isSubDeptAdmin, async (req, res) => {
  try {
    const deptIds = getSubDeptScopeIds(req.user);
    const students = await Student.findAll({
      where: { status: 'REJECTED' },
      include: [
        { model: Program, where: deptIds.length > 0 ? { subDeptId: { [Op.in]: deptIds } } : {}, attributes: ['id', 'name'] },
        { model: Department, as: 'center', attributes: ['id', 'name'] }
      ]
    });
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch rejected student logs' });
  }
});

router.post('/students/:id/approve', verifyToken, isSubDeptAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const deptIds = getSubDeptScopeIds(req.user);
    const student = await Student.findOne({
      where: { id },
      include: [{ model: Program, where: deptIds.length > 0 ? { subDeptId: { [Op.in]: deptIds } } : {} }]
    });

    if (!student) return res.status(404).json({ error: 'Student not found in jurisdictional queue' });

    await student.update({
      reviewStage: 'OPS', // State Machine Phase 2: SUB_DEPT -> OPS (status stays PENDING_REVIEW)
      enrollStatus: 'pending_ops',
      reviewedBy: req.user.uid,
      reviewedAt: new Date(),
    });

    erpEvents.emit('SUBDEPT_APPROVED', {
        studentId: student.id,
        subDeptId: student.program?.subDeptId || getSubDeptId(req.user)
    });

    res.json({ message: 'Student application approved and routed to Academic Operations', student });
  } catch (error) {
    res.status(500).json({ error: 'Approval protocol failed' });
  }
});

router.post('/students/:id/reject', verifyToken, isSubDeptAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const deptIds = getSubDeptScopeIds(req.user);

    if (!reason) return res.status(400).json({ error: 'Mandatory: Rejection reason required' });

    const student = await Student.findOne({
      where: { id },
      include: [{ model: Program, where: deptIds.length > 0 ? { subDeptId: { [Op.in]: deptIds } } : {} }]
    });

    if (!student) return res.status(404).json({ error: 'Student not found in jurisdictional queue' });

    await student.update({
      status: 'REJECTED',
      lastRejectionReason: reason,
      reviewedBy: req.user.uid,
      reviewedAt: new Date(),
      enrollStatus: 'rejected_subdept' // For legacy compatibility
    });

    res.json({ message: 'Student application rejected', student });
  } catch (error) {
    res.status(500).json({ error: 'Rejection protocol failed' });
  }
});

// --- Accreditation Interest Requests ---

router.get('/accreditation-ops/entities', verifyToken, isSubDeptAdmin, async (req, res) => {
  try {
    const universities = await Department.findAll({ 
      where: { type: 'universities', status: { [Op.in]: ['active', 'staged'] } }, 
      attributes: ['id', 'name'] 
    });
    const subDepts = await Department.findAll({ 
      where: { type: { [Op.in]: ['sub-departments', 'sub-department'] }, status: { [Op.in]: ['active', 'staged'] } }, 
      attributes: ['id', 'name'] 
    });
    res.json({ universities, subDepts });
  } catch (error) { res.status(500).json({ error: 'Failed to fetch routing entities' }); }
});

router.get('/accreditation-requests', verifyToken, isSubDeptAdmin, async (req, res) => {
  try {
    console.log("Accreditation Request Audit - USER:", {
      id: req.user.uid,
      role: req.user.role,
      deptId: req.user.deptId
    });

    const { unit, status } = req.query;
    const roleNormalized = req.user.role?.toLowerCase().trim();
    const isGlobalOps = ['organization admin', 'operations admin', 'operations administrator', 'academic operations admin', 'academic operations department'].includes(roleNormalized);
    const scopeIds = getSubDeptScopeIds(req.user);
    const scopeDepartments = scopeIds.length > 0
      ? await Department.findAll({
          where: { id: { [Op.in]: scopeIds } },
          attributes: ['id', 'name'],
          raw: true
        })
      : [];
    const scopeTypeNames = [...new Set([
      ...scopeDepartments.map((dept) => dept.name).filter(Boolean),
      req.user.subDepartment,
      normalizeInstitutionRoleName(req.user.role || '').replace(/\s+admin$/i, '').trim(),
      unit
    ].filter(Boolean))];
    
    console.log("Accreditation Request Filter:", { unit, status, scopeIds, scopeTypeNames, role: req.user.role });

    const whereClause = {
      status: status || 'pending'
    };

    if (!isGlobalOps) {
      if (whereClause.status === 'pending') {
        whereClause.type = scopeTypeNames.length > 0 ? { [Op.in]: scopeTypeNames } : roleNormalized;
      } else if (scopeIds.length > 0) {
        whereClause[Op.or] = [
          { assignedSubDeptId: { [Op.in]: scopeIds } },
          ...(scopeTypeNames.length > 0 ? [{ type: { [Op.in]: scopeTypeNames } }] : [])
        ];
      } else if (scopeTypeNames.length > 0) {
        whereClause.type = { [Op.in]: scopeTypeNames };
      }
    } else if (unit) {
      whereClause[Op.or] = [
        { type: unit },
        ...(Number.isInteger(Number(unit)) ? [{ assignedSubDeptId: Number(unit) }] : [])
      ];
    }

    const requests = await AccreditationRequest.findAll({
      where: whereClause,
      include: [
        { model: Department, as: 'center', attributes: ['id', 'name'] }
      ]
    });

    console.log(`Found ${requests.length} pending accreditation requests`);
    res.json(requests);
  } catch (error) {
    console.error("Accreditation API Error:", error);
    res.status(500).json({ 
      error: 'Failed to fetch accreditation requests',
      message: error.message 
    });
  }
});

router.put('/accreditation-requests/:id/approve', verifyToken, isSubDeptAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { assignedUniversityId, assignedSubDeptId, remarks } = req.body; 
    
    const request = await AccreditationRequest.findByPk(id);
    if (!request) return res.status(404).json({ error: 'Accreditation request not found' });

    // Step 1: Assign administrative routing blocks and transfer to finance governance.
    await request.update({
      status: 'finance_pending',
      assignedUniversityId,
      assignedSubDeptId,
      remarks
    });

    // Step 2: Notify Finance Admins that a verified request is awaiting ratification,
    // and notify the requesting Partner Center that Operations has forwarded their request.
    try {
      const financeAdmins = await User.findAll({
        where: { role: { [Op.in]: ['Finance Admin', 'Organization Admin'] } },
        attributes: ['uid']
      });
      await Promise.all(financeAdmins.map((admin) => Notification.create({
        userUid: admin.uid,
        type: 'info',
        message: `Operations cleared program request "${request.courseName}" — awaiting Finance ratification.`,
        link: '/dashboard/finance/accreditation-queue'
      })));

      const center = await Department.findByPk(request.centerId);
      if (center?.adminId) {
        await Notification.create({
          userUid: center.adminId,
          type: 'info',
          message: `Your program request "${request.courseName}" has been verified by Operations and forwarded to Finance for final approval.`,
          link: '/dashboard/partner-center/accreditation'
        });
      }
    } catch (notifyError) {
      console.error('[ACCREDITATION_FORWARD_NOTIFY_ERROR]:', notifyError);
    }

    res.json({ message: 'Request formally authorized and transferred to Finance Queue', request });
  } catch (error) {
    console.error('Accreditation approval error:', error);
    res.status(500).json({ error: 'Accreditation approval protocol failed' });
  }
});

export default router;
