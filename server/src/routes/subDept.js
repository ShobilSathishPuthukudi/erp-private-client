import express from 'express';
import { models, sequelize } from '../models/index.js';
import { Op } from 'sequelize';
import { verifyToken } from '../middleware/verifyToken.js';
import erpEvents from '../lib/events.js';

const router = express.Router();
const { Program, Student, Department, AccreditationRequest, ProgramOffering, Payment } = models;

const getSubDeptId = (user) => {
  if (!user) return null;
  const roleStr = (user.role || '').toLowerCase().trim();
  // Administrative roles bypass jurisdictional filtering
  const adminRoles = ['operations admin', 'organization admin', 'academic operations admin'];
  if (adminRoles.includes(roleStr)) return null;
  
  const unitStr = (user.subDepartment || user.role || '').toLowerCase();
  if (unitStr.includes('open school admin')) return 8;
  if (unitStr.includes('online department admin')) return 9;
  if (unitStr.includes('skill department admin')) return 10;
  if (unitStr.includes('bvoc department admin')) return 11;
  return user.deptId || user.departmentId;
};

const isSubDeptAdmin = (req, res, next) => {
  const role = req.user.role?.toLowerCase().trim();
  const deptId = getSubDeptId(req.user);
  
  // Normalized whitelists for robust comparison
  const adminRoles = ['operations admin', 'organization admin', 'academic operations admin'];
  const unitAdminRoles = ['dept-admin', 'dept_admin', 'sub_dept_admin', 'open school admin', 'online department admin', 'skill department admin', 'bvoc department admin'];
  const allowedRoles = [...adminRoles, ...unitAdminRoles];
  
  if (!allowedRoles.includes(role)) {
    return res.status(403).json({ error: 'Access denied: Insufficient privileges' });
  }

  // Academic/Operations admins can bypass deptId requirement
  if (adminRoles.includes(role) && !deptId) {
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
    const deptId = req.user.deptId;

    // 1. Jurisdictional Program Count
    const totalPrograms = await Program.count({ 
      where: deptId ? { subDeptId: deptId } : {} 
    });
    
    // 2. Jurisdictional Student Count
    const totalStudents = await Student.count({
      include: [
        { 
          model: Program, 
          where: deptId ? { subDeptId: deptId } : {}, 
          attributes: [] 
        }
      ]
    });
    
    // 3. Pending Verifications
    const pendingVerifications = await Student.count({
      where: { enrollStatus: 'pending_subdept' },
      include: [
        { 
          model: Program, 
          where: deptId ? { subDeptId: deptId } : {}, 
          attributes: [] 
        }
      ]
    });
    
    // 4. Jurisdictional Revenue
    const payments = await Payment.findAll({
      include: [
        { 
          model: Student, 
          attributes: [],
          include: [{ model: Program, where: deptId ? { subDeptId: deptId } : {}, attributes: [] }]
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
    const isGlobal = (['Operations Admin', 'Organization Admin'].includes(req.user.role) && !querySubDeptId);
    
    const programs = await Program.findAll({
      where: isGlobal ? {} : { subDeptId: deptId },
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
    const deptId = getSubDeptId(req.user);

    const program = await Program.findOne({ 
      where: { 
        id, 
        ...(deptId ? { subDeptId: deptId } : {}) 
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
    const isGlobal = (['Operations Admin', 'Organization Admin'].includes(req.user.role));
    const students = await Student.findAll({
      include: [
        { 
          model: Program, 
          where: isGlobal ? {} : { subDeptId: req.user.deptId },
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
    const deptId = getSubDeptId(req.user);

    const student = await Student.findOne({
      where: { id },
      include: [{ model: Program, where: deptId ? { subDeptId: deptId } : {} }]
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
router.get('/students/pending', verifyToken, isSubDeptAdmin, async (req, res) => {
  try {
    const deptId = getSubDeptId(req.user);
    const students = await Student.findAll({
      where: {
        status: 'PENDING_REVIEW',
        reviewStage: 'SUB_DEPT'
      },
      include: [
        { model: Program, where: deptId ? { subDeptId: deptId } : {}, attributes: ['id', 'name'] },
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
    const deptId = getSubDeptId(req.user);
    const students = await Student.findAll({
      where: { 
        status: { 
          [Op.in]: ['OPS_APPROVED', 'FINANCE_PENDING', 'PAYMENT_VERIFIED'] 
        } 
      },
      include: [
        { model: Program, where: deptId ? { subDeptId: deptId } : {}, attributes: ['id', 'name'] },
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
    const deptId = getSubDeptId(req.user);
    const students = await Student.findAll({
      where: { 
        status: { 
          [Op.in]: ['FINANCE_APPROVED', 'ACTIVE', 'ENROLLED'] 
        } 
      },
      include: [
        { model: Program, where: deptId ? { subDeptId: deptId } : {}, attributes: ['id', 'name'] },
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
    const deptId = getSubDeptId(req.user);
    const students = await Student.findAll({
      where: { status: 'REJECTED' },
      include: [
        { model: Program, where: deptId ? { subDeptId: deptId } : {}, attributes: ['id', 'name'] },
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
    const deptId = getSubDeptId(req.user);
    const student = await Student.findOne({
      where: { id },
      include: [{ model: Program, where: deptId ? { subDeptId: deptId } : {} }]
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
        subDeptId: getSubDeptId(req.user)
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
    const deptId = getSubDeptId(req.user);

    if (!reason) return res.status(400).json({ error: 'Mandatory: Rejection reason required' });

    const student = await Student.findOne({
      where: { id },
      include: [{ model: Program, where: deptId ? { subDeptId: deptId } : {} }]
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
    const targetType = unit || (isGlobalOps ? null : roleNormalized);
    
    console.log("Accreditation Request Filter:", { unit, status, targetType, role: req.user.role });

    const requests = await AccreditationRequest.findAll({
      where: { 
          status: status || 'pending',
          type: targetType ? targetType : { [Op.ne]: null }
      },
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

    res.json({ message: 'Request formally authorized and transferred to Finance Queue', request });
  } catch (error) {
    console.error('Accreditation approval error:', error);
    res.status(500).json({ error: 'Accreditation approval protocol failed' });
  }
});

export default router;
