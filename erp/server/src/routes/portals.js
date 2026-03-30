import express from 'express';
import { models } from '../models/index.js';
import { verifyToken } from '../middleware/verifyToken.js';
import sequelize from '../config/db.js';
import erpEvents from '../lib/events.js';

const router = express.Router();
const { Student, AdmissionSession, Invoice, Task, Leave, Department, Program, User, ProgramFee, AccreditationRequest, ProgramOffering, CenterProgram, Payment } = models;

const requireRole = (role) => (req, res, next) => {
  const userRole = req.user.role?.toLowerCase();
  const targetRole = role.toLowerCase();
  
  const isMatch = userRole === targetRole || 
                 (targetRole === 'study-center' && userRole === 'center') ||
                 (targetRole === 'center' && userRole === 'study-center');

  if (!isMatch) {
    return res.status(403).json({ error: `Access denied: Requires ${role} role` });
  }
  next();
};

// --- STUDY CENTER PORTAL ---
router.get('/study-center/students', verifyToken, requireRole('study-center'), async (req, res) => {
  try {
    let centerId = req.user.deptId;
    
    if (!centerId) {
      const center = await Department.findOne({ where: { adminId: req.user.uid, type: 'center' } });
      if (center) centerId = center.id;
    }

    if (!centerId) return res.status(400).json({ error: 'Center ID not assigned' });
    
    const students = await Student.findAll({
      where: { centerId },
      include: [
        { model: Program },
        { 
          model: Invoice, 
          as: 'activationInvoice',
          include: [{ model: Payment }]
        }
      ]
    });
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

router.get('/study-center/programs', verifyToken, requireRole('study-center'), async (req, res) => {
  try {
    let centerId = req.user.deptId;
    if (!centerId) {
      const center = await Department.findOne({ where: { adminId: req.user.uid, type: 'center' } });
      if (center) centerId = center.id;
    }

    if (!centerId) return res.status(400).json({ error: 'Center ID not assigned' });

    const programs = await CenterProgram.findAll({
      where: { centerId, isActive: true },
      include: [{ 
        model: Program, 
        include: [{ model: Department, as: 'university', attributes: ['name'] }] 
      }]
    });
    res.json(programs);
  } catch (error) {
    console.error('Fetch center programs error:', error);
    res.status(500).json({ error: 'Failed to fetch authorized programs' });
  }
});

router.get('/study-center/sessions', verifyToken, requireRole('study-center'), async (req, res) => {
  try {
    const { programId } = req.query;
    let centerId = req.user.deptId;
    if (!centerId) {
      const center = await Department.findOne({ where: { adminId: req.user.uid, type: 'center' } });
      if (center) centerId = center.id;
    }

    if (!centerId) return res.status(400).json({ error: 'Center ID not assigned' });

    const whereClause = { 
      centerId, 
      isActive: true, 
      approvalStatus: 'APPROVED' 
    };
    if (programId) whereClause.programId = programId;

    const sessions = await AdmissionSession.findAll({
      where: whereClause,
      include: [{ model: Program, attributes: ['id', 'name', 'type'] }]
    });
    res.json(sessions);
  } catch (error) {
    console.error('Fetch center sessions error:', error);
    res.status(500).json({ error: 'Failed to fetch active batches' });
  }
});

router.post('/study-center/accept-proposal', verifyToken, requireRole('study-center'), async (req, res) => {
  try {
    const center = await Department.findOne({ where: { adminId: req.user.uid, type: 'center' } });
    if (!center) return res.status(404).json({ error: 'Center profile not found for this identity' });
    
    if (center.centerStatus !== 'PROPOSED') {
        return res.status(400).json({ error: 'Governance Error: No pending proposal located for this center node.' });
    }

    await center.update({ centerStatus: 'APPROVED_BY_CENTER' });
    
    // Explicit Audit
    await models.AuditLog.create({
        entity: 'Department',
        action: 'ACCEPT_PROPOSAL',
        userId: req.user.uid,
        before: { centerStatus: 'PROPOSED' },
        after: { centerStatus: 'APPROVED_BY_CENTER' },
        module: 'Institutional Portal'
    });

    res.json({ message: 'Institutional Proposal Accepted. Center status updated to APPROVED_BY_CENTER.' });
  } catch (error) {
    res.status(500).json({ error: 'Proposal acceptance protocol failed' });
  }
});

router.post('/study-center/admission', verifyToken, requireRole('study-center'), async (req, res) => {
  try {
    const { name, email, sessionId, feeSchemaId, marks, marksProof } = req.body;
    const programId = Number(req.body.programId);
    
    // Validate center
    const center = await Department.findOne({ where: { adminId: req.user.uid, type: 'center' } });
    if (!center) return res.status(400).json({ error: 'Center profile not found for this user' });

    // --- Phase 3 & 5: Center-Program Mapping Validation ---
    const mapping = await CenterProgram.findOne({ 
        where: { centerId: center.id, programId, isActive: true } 
    });
    if (!mapping) {
        return res.status(403).json({ error: 'This center is not authorized to execute enrollment protocols for the requested program framework' });
    }

    const program = await Program.findByPk(programId);
    if (!program) return res.status(404).json({ error: 'Program framework not found' });

    // --- Step: Identify Applicable Fee Schema ---
    let effectiveFeeSchemaId = mapping.feeSchemaId;

    if (!effectiveFeeSchemaId) {
        // Fallback: Use the default fee schema for this program (Phase 5 Enrollment Stabilization)
        const defaultSchema = await ProgramFee.findOne({ 
            where: { programId, isDefault: true, isActive: true },
            order: [['version', 'DESC']]
        });

        if (defaultSchema) {
            effectiveFeeSchemaId = defaultSchema.id;
        } else {
            return res.status(400).json({ error: 'Institutional Fee structure not yet finalized for this center-program pairing by Finance and no Default backup located.' });
        }
    }

    // Validate active session
    if (!sessionId) return res.status(400).json({ error: 'Admission Intake session is required for enrollment' });
    const session = await AdmissionSession.findOne({ 
        where: { id: sessionId, programId, isActive: true, approvalStatus: 'APPROVED' } 
    });
    if (!session) return res.status(400).json({ error: 'No active/approved admission batch located for this program' });

    // Validate capacity
    const enrolledCount = await Student.count({ where: { sessionId, status: ['PENDING_REVIEW', 'OPS_APPROVED', 'FINANCE_PENDING', 'PAYMENT_VERIFIED', 'FINANCE_APPROVED', 'ENROLLED'] } });
    if (enrolledCount >= session.maxCapacity) {
        return res.status(400).json({ error: 'Selected batch has reached maximum intake capacity' });
    }

    // Validate fee schema
    const feeSchema = await ProgramFee.findByPk(effectiveFeeSchemaId);
    if (!feeSchema || feeSchema.programId !== programId) {
      return res.status(400).json({ error: 'Invalid or misaligned fee schema detected in center mapping' });
    }

    // Phase 2: Transactional Admission & Invoice Logic
    const result = await sequelize.transaction(async (t) => {
      // 1. Create Student
      const student = await Student.create({
        name,
        email,
        deptId: program.universityId,
        centerId: center.id,
        programId,
        sessionId,
        feeSchemaId: effectiveFeeSchemaId,
        subDepartmentId: mapping.subDeptId,
        status: 'PENDING_REVIEW', // Aligned with DB ENUM
        enrollStatus: 'pending_ops', // Internal legacy tag
        marks,
        verificationLogs: [
          { step: 'Center', time: new Date(), status: 'PENDING_REVIEW', by: req.user.uid }
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

      // 5. Process Initial Payment (if provided)
      if (req.body.payment && req.body.payment.mode) {
        const payment = await Payment.create({
          studentId: student.id,
          amount: totalAmount,
          mode: req.body.payment.mode,
          transactionId: req.body.payment.transactionId,
          receiptUrl: req.body.payment.receiptUrl,
          status: 'pending',
          date: new Date()
        }, { transaction: t });

        await invoice.update({ paymentId: payment.id }, { transaction: t });
      }

      return { student, invoice };
    });

    // ERP Event Bus: Initialize Institutional Pipeline (Phase 8)
    erpEvents.emit('STUDENT_CREATED', { 
        studentId: result.student.id, 
        centerId: result.student.centerId 
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Admission Phase 2 Failure:', error);
    res.status(500).json({ error: 'Failed to initiate admission protocol' });
  }
});

router.put('/study-center/admission/:id', verifyToken, requireRole('study-center'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, marks, payment } = req.body;

    const center = await Department.findOne({ where: { adminId: req.user.uid, type: 'center' } });
    if (!center) return res.status(404).json({ error: 'Center profile not found' });

    const student = await Student.findOne({
      where: { id, centerId: center.id }
    });

    if (!student) return res.status(404).json({ error: 'Student record not found in your jurisdiction' });
    
    // Defensive Check: Ensure Invoice exists if we're trying to update payment
    if (payment && !student.invoiceId) {
       return res.status(400).json({ error: 'Financial Integrity Error: Student record is not linked to an activation invoice.' });
    }
    
    // Only allow editing if not already approved/enrolled
    if (!['PENDING_REVIEW', 'DRAFT', 'REJECTED'].includes(student.status)) {
      return res.status(400).json({ error: 'Governance Error: Cannot modify records already advanced to institutional approval phase.' });
    }

    // Wrap in transaction for integrity
    await sequelize.transaction(async (t) => {
      await student.update({
        name: name || student.name,
        email: email || student.email,
        marks: marks ? { ...student.marks, ...marks } : student.marks
      }, { transaction: t });

      if (payment && payment.mode) {
        const invoice = await Invoice.findOne({ where: { id: student.invoiceId } });
        if (invoice) {
          if (invoice.paymentId) {
            await Payment.update({
              mode: payment.mode,
              transactionId: payment.transactionId,
              receiptUrl: payment.receiptUrl,
              status: 'pending'
            }, { where: { id: invoice.paymentId }, transaction: t });
          } else {
            const newPayment = await Payment.create({
              studentId: student.id,
              amount: invoice.total,
              mode: payment.mode,
              transactionId: payment.transactionId,
              receiptUrl: payment.receiptUrl,
              status: 'pending',
              date: new Date()
            }, { transaction: t });
            await invoice.update({ paymentId: newPayment.id }, { transaction: t });
          }
        }
      }
    });

    res.json({ message: 'Student record updated successfully', student });
  } catch (error) {
    console.error('Admission Refinement Failure:', error);
    res.status(500).json({ error: `Refinement Error: ${error.message}` });
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
        { 
          model: Program, 
          attributes: ['name', 'duration', 'type'],
          include: [{ model: Department, as: 'university', attributes: ['name'] }]
        },
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
    const now = new Date();
    const tasksRaw = await Task.findAll({
      where: { assignedTo: req.user.uid },
      order: [['deadline', 'ASC']]
    });

    const tasks = tasksRaw.map(t => {
      const task = t.toJSON();
      const isOverdue = new Date(task.deadline) < now && task.status !== 'completed';
      return {
        ...task,
        isOverdue,
        overdueLabel: isOverdue ? 'Overdue - Execution Node' : null
      };
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
    const { type, fromDate, toDate, reason } = req.body;
    const leave = await Leave.create({
      employeeId: req.user.uid,
      type,
      fromDate,
      toDate,
      reason: reason || null,
      status: 'pending_step1'
    });
    res.status(201).json(leave);
  } catch (error) {
    console.error('Create leave error:', error);
    res.status(500).json({ error: 'Failed to submit leave request' });
  }
});

router.delete('/employee/leaves/:id', verifyToken, requireRole('employee'), async (req, res) => {
  try {
    const { id } = req.params;
    const leave = await Leave.findOne({ 
      where: { id, employeeId: req.user.uid } 
    });

    if (!leave) return res.status(404).json({ error: 'Leave request not found or unauthorized' });
    
    if (leave.status !== 'pending_step1') {
      return res.status(400).json({ error: 'Only pending (Step-1) requests can be deleted' });
    }

    await leave.destroy();
    res.json({ message: 'Leave request deleted successfully' });
  } catch (error) {
    console.error('Delete leave error:', error);
    res.status(500).json({ error: 'Failed to delete leave request' });
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
