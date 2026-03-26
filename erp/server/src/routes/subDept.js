import express from 'express';
import { models } from '../models/index.js';
import { Op } from 'sequelize';
import { verifyToken } from '../middleware/verifyToken.js';

const router = express.Router();
const { Program, Student, Department, AccreditationRequest, ProgramOffering, Payment } = models;

const isSubDeptAdmin = (req, res, next) => {
  const role = req.user.role?.toLowerCase();
  const deptId = req.user.deptId || req.user.departmentId;
  const allowedRoles = ['dept-admin', 'dept_admin', 'sub_dept_admin', 'openschool', 'online', 'skill', 'bvoc', 'academic'];
  
  if (!allowedRoles.includes(role)) {
    return res.status(403).json({ error: 'Access denied: Insufficient privileges' });
  }

  // Academic admins can bypass deptId requirement
  if (role === 'academic' && !deptId) {
    return next();
  }

  if (!deptId) {
    return res.status(403).json({ error: 'Access denied: Must have an assigned department' });
  }

  // Normalize deptId
  req.user.deptId = deptId;
  next();
};

// --- Telemetry & Dashboard Stats ---
router.get('/stats', verifyToken, isSubDeptAdmin, async (req, res) => {
  try {
    const deptId = req.user.deptId;

    // 1. Jurisdictional Program Count
    const totalPrograms = await Program.count({ where: { subDeptId: deptId } });

    // 2. Jurisdictional Student Count
    const totalStudents = await Student.count({
      include: [{ model: Program, where: { subDeptId: deptId }, attributes: [] }]
    });

    // 3. Pending Verifications (at this specific sub-dept phase)
    const pendingVerifications = await Student.count({
      where: { enrollStatus: 'pending_subdept' },
      include: [{ model: Program, where: { subDeptId: deptId }, attributes: [] }]
    });

    // 4. Jurisdictional Revenue (sum of payments for students in this dept's programs)
    const payments = await Payment.findAll({
      include: [
        { 
          model: Student, 
          attributes: [],
          include: [{ model: Program, where: { subDeptId: deptId }, attributes: [] }]
        }
      ],
      attributes: [[models.sequelize.fn('SUM', models.sequelize.col('amount')), 'total']],
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
    
    const programs = await Program.findAll({
      where: { subDeptId: deptId },
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

    const program = await Program.findOne({ where: { id, subDeptId: req.user.deptId } });
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
    const students = await Student.findAll({
      include: [
        { 
          model: Program, 
          where: { subDeptId: req.user.deptId },
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

    const student = await Student.findOne({
      where: { id },
      include: [{ model: Program, where: { subDeptId: req.user.deptId } }]
    });

    if (!student) return res.status(404).json({ error: 'Student not found in your jurisdictional queue' });

    if (student.enrollStatus !== 'pending_subdept') {
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

// --- Accreditation Interest Requests ---
router.get('/accreditation-requests', verifyToken, isSubDeptAdmin, async (req, res) => {
  try {
    console.log("Accreditation Request Audit - USER:", {
      id: req.user.uid,
      role: req.user.role,
      deptId: req.user.deptId
    });

    const { unit } = req.query;
    const targetType = unit || (req.user.role === 'academic' ? null : req.user.role);
    
    console.log("Accreditation Request Filter:", { unit, targetType });

    const requests = await AccreditationRequest.findAll({
      where: { 
          status: 'pending',
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
    const { programId, remarks } = req.body; 
    
    const request = await AccreditationRequest.findByPk(id);
    if (!request) return res.status(404).json({ error: 'Accreditation request not found' });

    // 1. Link the program and approve the request
    await request.update({ 
      status: 'approved', 
      linkedProgramId: programId,
      remarks 
    });

    // 2. Create the offering authorization for the center
    await ProgramOffering.findOrCreate({
      where: { centerId: request.centerId, programId },
      defaults: { status: 'open', accreditationRequestId: request.id }
    });

    res.json({ message: 'Institutional accreditation approved and program linked', request });
  } catch (error) {
    console.error('Accreditation approval error:', error);
    res.status(500).json({ error: 'Accreditation approval protocol failed' });
  }
});

export default router;
