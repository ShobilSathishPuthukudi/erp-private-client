import express from 'express';
import { models } from '../models/index.js';
import { verifyToken } from '../middleware/verifyToken.js';
import sequelize from '../config/db.js';

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

    // Phase 2: Transactional Admission & Invoice Logic
    const result = await sequelize.transaction(async (t) => {
      // 1. Create Student
      const student = await Student.create({
        name,
        deptId: program.universityId,
        centerId: center.id,
        programId,
        sessionId,
        feeSchemaId,
        status: 'DRAFT',
        enrollStatus: 'pending_eligibility', // Keep for backward compatibility if needed, but status is primary
        marks,
        verificationLogs: [
          { step: 'Center', time: new Date(), status: 'submitted', by: req.user.uid }
        ]
      }, { transaction: t });

      // 2. Identify First Installment for Invoice
      const installments = feeSchema.schema.installments || [];
      const firstInstallment = installments[0] || { amount: 0 };
      const baseAmount = parseFloat(firstInstallment.amount);
      const gstAmount = baseAmount * 0.18; // Standard 18% Institutional GST
      const totalAmount = baseAmount + gstAmount;

      // 3. Generate Invoice
      const invoice = await Invoice.create({
        studentId: student.id,
        invoiceNo: `INV-${Date.now()}-${student.id}`,
        amount: baseAmount,
        gst: gstAmount,
        total: totalAmount,
        status: 'issued'
      }, { transaction: t });

      // 4. Link Invoice to Student
      await student.update({ invoiceId: invoice.id }, { transaction: t });

      return { student, invoice };
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Admission initiation error:', error);
    res.status(500).json({ error: 'Failed to initiate admission protocol' });
  }
});

router.post('/study-center/students/:id/submit', verifyToken, requireRole('study-center'), async (req, res) => {
  try {
    const { id } = req.params;
    const center = await Department.findOne({ where: { adminId: req.user.uid, type: 'center' } });
    if (!center) return res.status(404).json({ error: 'Center profile not found' });

    const student = await Student.findOne({ where: { id, centerId: center.id } });
    if (!student) return res.status(404).json({ error: 'Student asset not located' });

    if (student.status !== 'DRAFT') {
      return res.status(400).json({ error: 'Submission protocol failure: Only DRAFT students can be submitted.' });
    }

    const logs = student.verificationLogs || [];
    logs.push({ step: 'Center_Submission', time: new Date(), status: 'PENDING_REVIEW', by: req.user.uid });

    await student.update({ 
      status: 'PENDING_REVIEW',
      verificationLogs: logs
    });

    res.json({ message: 'Student successfully submitted to Sub-Department for review.', student });
  } catch (error) {
    console.error('Student submission error:', error);
    res.status(500).json({ error: 'Failed to submit student record' });
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

router.get('/student/profile', verifyToken, requireRole('student'), async (req, res) => {
  try {
    const studentIdStr = req.user.uid.replace('STU', '');
    const studentId = parseInt(studentIdStr);
    
    if (isNaN(studentId)) return res.status(400).json({ error: 'Invalid Student ID mapping' });

    const student = await Student.findOne({
      where: { id: studentId },
      include: [
        { model: Program, attributes: ['name', 'duration', 'type'] },
        { model: AdmissionSession, attributes: ['name', 'startDate', 'endDate'] },
        { 
            model: Invoice, 
            as: 'invoice', // Current outstanding invoice
            attributes: ['id', 'invoiceNo', 'total', 'status'] 
        },
        { model: Department, as: 'center', attributes: ['name'] }
      ]
    });
    
    if (!student) return res.status(404).json({ error: 'Student profile not located' });
    
    res.json(student);
  } catch (error) {
    console.error('Fetch student profile error:', error);
    res.status(500).json({ error: 'Failed to synchronize student portal profile' });
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

router.put('/employee/tasks/:id/complete', verifyToken, requireRole('employee'), async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks, evidenceUrl } = req.body;
    
    const task = await Task.findOne({ where: { id, assignedTo: req.user.uid } });
    if (!task) return res.status(404).json({ error: 'Task not found or unauthorized' });

    if (task.status === 'completed') return res.status(400).json({ error: 'Task is already completed' });

    await task.update({ 
      status: 'completed', 
      remarks: remarks || task.remarks,
      evidenceUrl: evidenceUrl || task.evidenceUrl,
      completedAt: new Date()
    });

    res.json({ message: 'Task completed successfully with evidence recorded.', task });
  } catch (error) {
    console.error('Complete task error:', error);
    res.status(500).json({ error: 'Failed to finalize task execution' });
  }
});

router.get('/employee/performance', verifyToken, requireRole('employee'), async (req, res) => {
  try {
    const tasks = await Task.findAll({ where: { assignedTo: req.user.uid } });
    
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const pending = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length;
    const overdue = tasks.filter(t => t.status === 'overdue').length;
    
    const completionRate = total > 0 ? (completed / total) * 100 : 0;

    res.json({
      total,
      completed,
      pending,
      overdue,
      completionRate: Math.round(completionRate)
    });
  } catch (error) {
    console.error('Fetch employee performance error:', error);
    res.status(500).json({ error: 'Failed to calculate performance metrics' });
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
