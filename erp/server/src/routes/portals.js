import express from 'express';
import { models } from '../models/index.js';
import { verifyToken } from '../middleware/verifyToken.js';

const router = express.Router();
const { Student, AdmissionSession, Invoice, Task, Leave, Department, Program, User, ProgramFee, AccreditationRequest, ProgramOffering } = models;

const requireRole = (role) => (req, res, next) => {
  if (req.user.role !== role) {
    return res.status(403).json({ error: `Access denied: Requires ${role} role` });
  }
  next();
};

// --- STUDY CENTER PORTAL ---
router.get('/study-center/students', verifyToken, requireRole('study-center'), async (req, res) => {
  try {
    if (!req.user.deptId) return res.status(400).json({ error: 'Center ID not assigned' });
    
    const students = await Student.findAll({
      where: { centerId: req.user.deptId },
      include: [{ model: Program, attributes: ['id', 'name', 'duration'] }]
    });
    res.json(students);
  } catch (error) {
    console.error('Fetch center students error:', error);
    res.status(500).json({ error: 'Failed to fetch center students' });
  }
});

router.post('/study-center/admission', verifyToken, requireRole('study-center'), async (req, res) => {
  try {
    const { name, programId, sessionId, feeSchemaId, marks, marksProof } = req.body;
    
    // Validate center
    const center = await Department.findOne({ where: { adminId: req.user.uid, type: 'center' } });
    if (!center) return res.status(400).json({ error: 'Center profile not found for this user' });

    // Validate program is Open
    const program = await Program.findByPk(programId);
    if (!program || program.status !== 'open') {
      return res.status(400).json({ error: 'Admissions are not currently open for this program' });
    }

    // Validate active session
    if (!sessionId) return res.status(400).json({ error: 'Admission Intake session is required for enrollment' });
    const session = await AdmissionSession.findOne({ 
        where: { id: sessionId, programId, isActive: true, approvalStatus: 'APPROVED' } 
    });
    if (!session) return res.status(400).json({ error: 'No active/approved admission batch located for this program' });

    // Validate capacity
    const enrolledCount = await Student.count({ where: { sessionId, enrollStatus: ['active', 'pending_eligibility', 'pending_validation'] } });
    if (enrolledCount >= session.maxCapacity) {
        return res.status(400).json({ error: 'Selected batch has reached maximum intake capacity' });
    }

    // Validate fee schema
    const feeSchema = await ProgramFee.findByPk(feeSchemaId);
    if (!feeSchema || feeSchema.programId !== programId) {
      return res.status(400).json({ error: 'Invalid fee schema selected' });
    }

    const student = await Student.create({
      name,
      deptId: program.universityId, // Linked to university for academic tracking
      centerId: center.id,
      programId,
      sessionId,
      feeSchemaId,
      enrollStatus: 'pending_eligibility',
      marks,
      verificationLogs: [
        { step: 'Center', time: new Date(), status: 'submitted', by: req.user.uid }
      ]
    });

    res.status(201).json(student);
  } catch (error) {
    console.error('Admission initiation error:', error);
    res.status(500).json({ error: 'Failed to initiate admission protocol' });
  }
});

// --- STUDENT PORTAL ---
router.get('/student/invoices', verifyToken, requireRole('student'), async (req, res) => {
  try {
    // Assuming student UID is formatted like 'STU1' -> id: 1
    const studentIdStr = req.user.uid.replace('STU', '');
    const studentId = parseInt(studentIdStr);
    
    if (isNaN(studentId)) return res.status(400).json({ error: 'Invalid Student ID mapping' });

    const invoices = await Invoice.findAll({
      where: { studentId },
      order: [['createdAt', 'DESC']]
    });
    res.json(invoices);
  } catch (error) {
    console.error('Fetch student invoices error:', error);
    res.status(500).json({ error: 'Failed to fetch your invoices' });
  }
});

// --- EMPLOYEE PORTAL ---
router.get('/employee/tasks', verifyToken, requireRole('employee'), async (req, res) => {
  try {
    const tasks = await Task.findAll({
      where: { assignedTo: req.user.uid },
      order: [['deadline', 'ASC']]
    });
    res.json(tasks);
  } catch (error) {
    console.error('Fetch employee tasks error:', error);
    res.status(500).json({ error: 'Failed to fetch your tasks' });
  }
});

router.put('/employee/tasks/:id/status', verifyToken, requireRole('employee'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const task = await Task.findOne({ where: { id, assignedTo: req.user.uid } });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    await task.update({ status });
    res.json(task);
  } catch (error) {
    console.error('Update employee task error:', error);
    res.status(500).json({ error: 'Failed to update task status' });
  }
});

router.get('/employee/leaves', verifyToken, requireRole('employee'), async (req, res) => {
  try {
    const leaves = await Leave.findAll({
      where: { employeeId: req.user.uid },
      order: [['createdAt', 'DESC']]
    });
    res.json(leaves);
  } catch (error) {
    console.error('Fetch employee leaves error:', error);
    res.status(500).json({ error: 'Failed to fetch your leave requests' });
  }
});

router.post('/employee/leaves', verifyToken, requireRole('employee'), async (req, res) => {
  try {
    const { type, fromDate, toDate } = req.body;
    const leave = await Leave.create({
      employeeId: req.user.uid,
      type,
      fromDate,
      toDate,
      status: 'pending_step1'
    });
    res.status(201).json(leave);
  } catch (error) {
    console.error('Create leave error:', error);
    res.status(500).json({ error: 'Failed to submit leave request' });
  }
});

// --- STUDY CENTER OFFERINGS & ACCREDITATION ---
router.get('/study-center/offerings', verifyToken, requireRole('study-center'), async (req, res) => {
  try {
    const center = await Department.findOne({ where: { adminId: req.user.uid, type: 'center' } });
    if (!center) return res.status(404).json({ error: 'Center profile not found' });

    const offerings = await ProgramOffering.findAll({
      where: { centerId: center.id },
      include: [{ 
          model: Program, 
          include: [{ model: Department, as: 'university', attributes: ['name'] }] 
      }]
    });
    res.json(offerings);
  } catch (error) {
    console.error('Fetch offerings error:', error);
    res.status(500).json({ error: 'Failed to fetch program offerings' });
  }
});

router.post('/study-center/offerings', verifyToken, requireRole('study-center'), async (req, res) => {
  try {
    const { programId } = req.body;
    const center = await Department.findOne({ where: { adminId: req.user.uid, type: 'center' } });
    if (!center) return res.status(404).json({ error: 'Center profile not found' });

    const program = await Program.findByPk(programId);
    if (!program || program.status === 'draft') {
      return res.status(400).json({ error: 'Only Active or Open programs can be selected' });
    }

    const [offering, created] = await ProgramOffering.findOrCreate({
      where: { centerId: center.id, programId },
      defaults: { status: 'open' }
    });

    res.status(201).json(offering);
  } catch (error) {
    console.error('Create offering error:', error);
    res.status(500).json({ error: 'Failed to open program for admissions' });
  }
});

router.post('/study-center/accreditation-interest', verifyToken, requireRole('study-center'), async (req, res) => {
  try {
    const { courseName, universityId, type, description } = req.body;
    const center = await Department.findOne({ where: { adminId: req.user.uid, type: 'center' } });
    if (!center) return res.status(404).json({ error: 'Center profile not found' });

    const request = await AccreditationRequest.create({
      centerId: center.id,
      courseName,
      universityId,
      type,
      description,
      status: 'pending'
    });

    res.status(201).json(request);
  } catch (error) {
    console.error('Accreditation interest error:', error);
    res.status(500).json({ error: 'Failed to record accreditation interest' });
  }
});

// --- SALES PORTAL (CRM INTAKE PLACEHOLDER) ---
router.get('/sales/leads', verifyToken, requireRole('sales'), async (req, res) => {
  // Placeholder for robust CRM features
  res.json([]);
});

export default router;
