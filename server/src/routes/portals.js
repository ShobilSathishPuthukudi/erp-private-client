import express from 'express';
import { models } from '../models/index.js';
import { verifyToken } from '../middleware/verifyToken.js';
import sequelize from '../config/db.js';
import { Op } from 'sequelize';
import erpEvents from '../lib/events.js';

const router = express.Router();
const { Student, AdmissionSession, Invoice, Task, Leave, Department, Program, User, ProgramFee, AccreditationRequest, ProgramOffering, CenterProgram, Payment, Notification, Subject, Mark, Exam } = models;
import { createNotification } from './notifications.js';

const getSubDeptId = (user) => {
  if (!user) return null;
  const unitStr = (user.subDepartment || user.role || '').toLowerCase();
  if (unitStr.includes('open school admin')) return 8;
  if (unitStr.includes('online department admin')) return 9;
  if (unitStr.includes('skill department admin')) return 10;
  if (unitStr.includes('bvoc department admin')) return 11;
  return user.deptId || user.departmentId;
};

const requireRole = (role) => (req, res, next) => {
  const userRole = req.user.role?.toLowerCase()?.trim();
  const targetRole = role.toLowerCase()?.trim();
  
  // Support legacy, plural, and alias formats (Institutional Standardization)
  const normalize = (r) => {
    if (!r) return '';
    let res = r.replace(/-/g, ' ').toLowerCase().trim();
    if (res.endsWith('s')) res = res.slice(0, -1); // Basic singularization for cross-match
    if (res === 'study center') return 'partner center';
    return res;
  };
  const isMatch = normalize(userRole) === normalize(targetRole);

  if (!isMatch) {
    return res.status(403).json({ error: `Access denied: Requires ${role} role` });
  }
  next();
};

// --- PARTNER CENTER PORTAL ---
router.get('/partner-center/students', verifyToken, requireRole('Partner Centers'), async (req, res) => {
  try {
    let centerId = req.user.deptId;
    
    if (!centerId) {
      let center = await Department.findOne({ where: { id: req.user.deptId } });
    if (!center) center = await Department.findOne({ where: { adminId: req.user.uid, type: 'partner centers' } });
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

// Alias for Study Center support (GAP-RESTORE)
router.get('/study-center/students', verifyToken, requireRole('Partner Centers'), async (req, res) => {
  try {
    let centerId = req.user.deptId;
    if (!centerId) {
      const center = await Department.findOne({ where: { adminId: req.user.uid, type: 'partner centers' } });
      if (center) centerId = center.id;
    }
    if (!centerId) return res.status(400).json({ error: 'Center ID not assigned' });
    
    const students = await Student.findAll({
      where: { centerId },
      include: [{ model: Program }]
    });
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

router.get('/partner-center/programs', verifyToken, requireRole('Partner Centers'), async (req, res) => {
  try {
    let centerId = req.user.deptId;
    if (!centerId) {
      let center = await Department.findOne({ where: { id: req.user.deptId } });
    if (!center) center = await Department.findOne({ where: { adminId: req.user.uid, type: 'partner centers' } });
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

// Alias for Study Center support (GAP-RESTORE)
router.get('/study-center/programs', verifyToken, requireRole('Partner Centers'), async (req, res) => {
  try {
    let centerId = req.user.deptId;
    if (!centerId) {
      const center = await Department.findOne({ where: { adminId: req.user.uid, type: 'partner centers' } });
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
    console.error('Fetch center programs alias error:', error);
    res.status(500).json({ error: 'Failed to fetch authorized programs' });
  }
});

router.get('/sessions', verifyToken, async (req, res) => {
  try {
    const { programId, centerId: queryCenterId } = req.query;
    const role = req.user.role?.toLowerCase();
    
    let whereClause = { 
      isActive: true, 
      approvalStatus: 'APPROVED' 
    };

    if (programId) whereClause.programId = programId;

    // Jurisdictional Filtering for Sessions
    if (role === 'partner center' || role === 'study center') {
        let centerId = req.user.deptId;
        if (!centerId) {
            const center = await Department.findOne({ where: { adminId: req.user.uid, type: 'partner centers' } });
            if (center) centerId = center.id;
        }
        if (centerId) {
            whereClause.centerId = { [Op.or]: [centerId, null] };
        }
    } else if (['open school admin', 'online department admin', 'skill department admin', 'bvoc department admin'].includes(role)) {
        const subDeptId = getSubDeptId(req.user);
        if (subDeptId) whereClause.subDeptId = subDeptId;
    } else if (['operations admin', 'organization admin'].includes(role)) {
        if (queryCenterId && queryCenterId !== 'all') whereClause.centerId = queryCenterId;
    }

    const sessions = await AdmissionSession.findAll({
      where: whereClause,
      include: [{ model: Program, attributes: ['id', 'name', 'type'] }]
    });
    res.json(sessions);
  } catch (error) {
    console.error('Fetch sessions error:', error);
    res.status(500).json({ error: 'Failed to fetch active batches' });
  }
});

// Alias for Partner Center and Study Center support (GAP-RESTORE)
router.get(['/partner-center/sessions', '/study-center/sessions'], verifyToken, async (req, res) => {
  try {
    const { programId, centerId: queryCenterId } = req.query;
    const role = req.user.role?.toLowerCase()?.replace(/-/g, ' ')?.trim();
    
    let whereClause = { 
      isActive: true, 
      approvalStatus: 'APPROVED' 
    };

    if (programId) whereClause.programId = programId;

    // Jurisdictional Filtering for Sessions
    if (role === 'partner center' || role === 'study center') {
        let centerId = req.user.deptId;
        if (!centerId) {
            const center = await Department.findOne({ where: { adminId: req.user.uid, type: 'partner centers' } });
            if (center) centerId = center.id;
        }
        if (centerId) {
            whereClause.centerId = { [Op.or]: [centerId, null] };
        }
    }

    const sessions = await AdmissionSession.findAll({
      where: whereClause,
      include: [{ model: Program, attributes: ['id', 'name', 'type'] }]
    });
    res.json(sessions);
  } catch (error) {
    console.error('Fetch sessions alias error:', error);
    res.status(500).json({ error: 'Failed to fetch active batches' });
  }
});

router.post('/partner-center/accept-proposal', verifyToken, requireRole('Partner Centers'), async (req, res) => {
  try {
    let center = await Department.findOne({ where: { id: req.user.deptId } });
    if (!center) center = await Department.findOne({ where: { adminId: req.user.uid, type: 'partner centers' } });
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

router.post('/partner-center/admission', verifyToken, requireRole('Partner Centers'), async (req, res) => {
  try {
    const { name, email, sessionId, feeSchemaId, marks, marksProof } = req.body;
    const programId = Number(req.body.programId);
    
    // Validate center
    let center = await Department.findOne({ where: { id: req.user.deptId } });
    if (!center) center = await Department.findOne({ where: { adminId: req.user.uid, type: 'partner centers' } });
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
    let effectiveFeeSchemaId = mapping.feeSchemaId || feeSchemaId;
    let feeSchema = null;

    if (effectiveFeeSchemaId === 'default_fee') {
        if (program.totalFee > 0) {
            feeSchema = {
                id: null,
                programId: programId,
                schema: {
                    installments: [{ label: 'Full Program Fee', amount: program.totalFee }]
                }
            };
            effectiveFeeSchemaId = null; 
        } else {
             return res.status(400).json({ error: 'No fee configuration located for this program.' });
        }
    } else {
        if (!effectiveFeeSchemaId) {
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

        feeSchema = await ProgramFee.findByPk(effectiveFeeSchemaId);
        if (!feeSchema || feeSchema.programId !== programId) {
          return res.status(400).json({ error: 'Invalid or misaligned fee schema detected in center mapping' });
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

    // Trigger University Status: Active (Refining Phase 3)
    if (program.universityId) {
        await Department.update({ status: 'active' }, { where: { id: program.universityId, type: 'universities' } });
    }

    // Trigger Program Status: Active
    await Program.update({ status: 'active' }, { where: { id: programId } });

    // 6. Notify Academic Operations
    try {
      const opsUsers = await User.findAll({ 
        where: { 
          role: { [Op.or]: ['Academic Operations', 'Organization Admin'] } 
        } 
      });
      
      for (const ops of opsUsers) {
        await createNotification(req.io, {
          userId: ops.uid,
          title: `New Enrollment: ${result.student.name}`,
          message: `Partner Center ${center.name} has submitted a new enrollment application for review.`,
          type: 'info',
          link: '/dashboard/academic/students?status=PENDING_REVIEW',
          metadata: { studentId: result.student.id, centerId: result.student.centerId }
        });
      }
    } catch (notifErr) {
      console.error('[NOTIF-ERROR] Failed to alert Academic Operations:', notifErr);
    }

    res.status(201).json(result);
  } catch (error) {
    console.error('Admission Phase 2 Failure:', error);
    res.status(500).json({ error: 'Failed to initiate admission protocol' });
  }
});

router.put('/partner-center/admission/:id', verifyToken, requireRole('Partner Centers'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, marks, payment } = req.body;

    let center = await Department.findOne({ where: { id: req.user.deptId } });
    if (!center) center = await Department.findOne({ where: { adminId: req.user.uid, type: 'partner centers' } });
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


// Alias for Study Center admissions (GAP-RESTORE)
router.post("/study-center/admission", verifyToken, requireRole("Partner Center"), async (req, res) => {
    res.redirect(307, "/api/portals/partner-center/admission");
});

router.put("/study-center/admission/:id", verifyToken, requireRole("Partner Center"), async (req, res) => {
    res.redirect(307, `/api/portals/partner-center/admission/${req.params.id}`);
});
router.post('/partner-center/students/:id/submit', verifyToken, requireRole('Partner Centers'), async (req, res) => {
  try {
    const { id } = req.params;
    let center = await Department.findOne({ where: { id: req.user.deptId } });
    if (!center) center = await Department.findOne({ where: { adminId: req.user.uid, type: 'partner-center' } });
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

    // --- Institutional Context for Sales (GAP-12) ---
    let institutionalStats = {};
    const userRole = req.user.role?.toLowerCase() || '';

    // Robust check for Sales affiliation
    const userWithDept = await User.unscoped().findByPk(req.user.uid, {
      include: [{ model: Department, as: 'department', attributes: ['name'] }]
    });
    const deptName = userWithDept?.department?.name?.toLowerCase() || '';
    const isSales = userRole.includes('sales') || deptName.includes('sales');

    if (isSales) {
      // Calculate Managed Leads (Partner Centers count)
      const validBdeIds = [req.user.uid];
      if (userWithDept?.referralCode) validBdeIds.push(userWithDept.referralCode);
      const aliasUsers = await User.findAll({ where: { referralCode: req.user.uid }, attributes: ['uid'] });
      aliasUsers.forEach(u => validBdeIds.push(u.uid));

      const [uniCount, progCount, leadsCount] = await Promise.all([
        Department.count({ where: { type: 'universities' } }),
        Program.count({}),
        Department.count({ 
          where: { 
            bdeId: { [Op.in]: validBdeIds },
            type: { [Op.in]: ['partner-center', 'partner centers'] }
          } 
        })
      ]);

      institutionalStats = { 
        universityCount: uniCount, 
        programCount: progCount,
        leadsCount: leadsCount
      };
    }

    res.json({
      total,
      completed,
      pending,
      overdue,
      completionRate: Math.round(completionRate),
      ...institutionalStats
    });
  } catch (error) {
    console.error('Fetch employee performance error:', error);
    res.status(500).json({ error: 'Failed to calculate performance metrics' });
  }
});

router.get('/employee/my-centers', verifyToken, requireRole('employee'), async (req, res) => {
  try {
    const userProfile = await User.findByPk(req.user.uid);
    const validBdeIds = [req.user.uid];
    if (userProfile?.referralCode) validBdeIds.push(userProfile.referralCode);

    const aliasUsers = await User.findAll({ where: { referralCode: req.user.uid } });
    aliasUsers.forEach(u => validBdeIds.push(u.uid));

    const centers = await Department.findAll({
      where: { 
        bdeId: { [Op.in]: validBdeIds },
        type: { [Op.in]: ['partner-center'] }
      },
      order: [['createdAt', 'DESC']]
    });
    res.json(centers);
  } catch (error) {
    console.error('[PORTAL] Fetch My-Centers Error:', error);
    res.status(500).json({ error: 'Failed to synchronize referred institutional roster' });
  }
});


router.get('/employee/leaves', verifyToken, requireRole('employee'), async (req, res) => {
  try {
    const leaves = await Leave.findAll({
      where: { employeeId: req.user.uid },
      include: [
        { 
          model: User, 
          as: 'employee', 
          attributes: ['uid', 'name', 'deptId'],
          include: [{ model: Department, as: 'department', attributes: ['name'] }]
        }
      ],
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
    
    // Resolve Department Head to determine workflow (Shortcut Rule: Head is Admin -> Skip Step 1)
    let initialStatus = 'pending_step1';
    try {
      const employee = await User.findOne({ where: { uid: req.user.uid } });
      if (employee?.deptId) {
        const dept = await Department.findByPk(employee.deptId, {
          include: [{ model: User, as: 'department', attributes: ['role'] }]
        });
        
        // Use the alias defined in models/index.js (User belongsTo Department as department)
        // Wait, check if Head is aliased as 'admin' in Department model
        const head = await User.findOne({ 
          where: { uid: dept?.adminId },
          attributes: ['role']
        });

        const headRole = head?.role?.toLowerCase();
        if (headRole === 'Organization Admin' || headRole === 'admin') {
          initialStatus = 'pending_step2';
        }
      }
    } catch (err) {
      console.error('[LEAVE-WORKFLOW] Head resolution failed, falling back to 2-step:', err);
    }

    const leave = await Leave.create({
      employeeId: req.user.uid,
      type,
      fromDate,
      toDate,
      reason: reason || null,
      status: initialStatus
    });

    // Unified Notification Logic (Phase 10 Oversight)
    try {
      // 1. Notify HR administrators (Standard Oversight)
      const hrUsers = await User.findAll({ where: { role: 'HR Admin' } });
      const employee = await User.findOne({ where: { uid: req.user.uid } });
      const employeeName = employee?.name || req.user.uid;

      for (const hr of hrUsers) {
        await createNotification(req.io, {
          targetUid: hr.uid,
          title: 'New Leave Request (HR)',
          message: `${employeeName} submitted a ${type} request${initialStatus === 'pending_step2' ? ' (Admin Shortcut)' : ''}.`,
          type: 'info',
          link: '/dashboard/hr/leaves'
        });
      }

      // 2. Notify Department Head (Only if they didn't already skip Step-1)
      if (initialStatus === 'pending_step1') {
        const dept = await Department.findByPk(employee?.deptId);
        
        if (dept?.adminId) {
          const targetAdmin = await User.findByPk(dept.adminId);
          const role = targetAdmin?.role?.toLowerCase()?.trim();
          let adminLink = '/dashboard/team/leaves'; 
          
          if (role === 'HR Admin') adminLink = '/dashboard/hr/dept-leaves';
          else if (role === 'Sales & CRM Admin') adminLink = '/dashboard/sales/leaves';
          else if (role === 'Finance Admin') adminLink = '/dashboard/finance/leaves';
          else if (role === 'Operations Admin') adminLink = '/dashboard/operations/leaves';
          else if (role === 'Operations Admin') adminLink = '/dashboard/operations';
          else if (['Open School Admin', 'Online Department Admin', 'Skill Department Admin', 'BVoc Department Admin'].includes(role)) adminLink = `/dashboard/subdept/${role}/leaves`;

          await createNotification(req.io, {
            targetUid: dept.adminId,
            title: 'Team Leave Application',
            message: `${employeeName} is requesting ${type} (${fromDate} to ${toDate}).`,
            type: 'info',
            link: adminLink
          });
        }
      }

      // 3. Notify Employee (If it's an auto-forward case)
      if (initialStatus === 'pending_step2') {
        await createNotification(req.io, {
          targetUid: req.user.uid,
          title: 'Institutional Forwarding',
          message: `Your ${type} request has been automatically forwarded to HR for finalization based on departmental hierarchy.`,
          type: 'success',
          link: '/dashboard/employee/leaves'
        });
      }
    } catch (notifyError) {
      console.error('[NOTIFY-HR] Failure sending leave alerts:', notifyError);
      // Non-blocking error for notifications
    }

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

// --- PARTNER CENTER OFFERINGS & ACCREDITATION ---
router.get('/partner-center/offerings', verifyToken, requireRole('Partner Centers'), async (req, res) => {
  try {
    let center = await Department.findOne({ where: { id: req.user.deptId } });
    if (!center) center = await Department.findOne({ where: { adminId: req.user.uid, type: 'partner-center' } });
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

router.post('/partner-center/offerings', verifyToken, requireRole('Partner Centers'), async (req, res) => {
  try {
    const { programId } = req.body;
    let center = await Department.findOne({ where: { id: req.user.deptId } });
    if (!center) center = await Department.findOne({ where: { adminId: req.user.uid, type: 'partner-center' } });
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

router.post('/partner-center/accreditation-interest', verifyToken, requireRole('Partner Centers'), async (req, res) => {
  try {
    const { courseName, universityId, type, description } = req.body;
    let center = await Department.findOne({ where: { id: req.user.deptId } });
    if (!center) center = await Department.findOne({ where: { adminId: req.user.uid, type: 'partner-center' } });
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

// --- ASSESSMENT & GRADING (STUDY CENTER) ---

router.get('/subjects/:programId', verifyToken, async (req, res) => {
  try {
    const { programId } = req.params;
    const subjects = await Subject.findAll({ 
        where: { programId },
        order: [['name', 'ASC']]
    });
    res.json(subjects);
  } catch (error) {
    res.status(500).json({ error: 'Failed to synchronize curriculum subjects' });
  }
});

router.get('/partner-center/marks/grading-roster', verifyToken, requireRole('Partner Centers'), async (req, res) => {
  try {
    const { programId, sessionId, subjectName } = req.query;
    let centerId = req.user.deptId;
    if (!centerId) {
      let center = await Department.findOne({ where: { adminId: req.user.uid, type: 'partner-center' } });
      if (center) centerId = center.id;
    }

    if (!centerId || !programId || !sessionId) {
      return res.status(400).json({ error: 'Missing mandatory grading context (Program/Batch)' });
    }

    // Find all enrolled students for this batch/center
    const students = await Student.findAll({
      where: { 
          centerId, 
          programId, 
          sessionId,
          status: { [Op.in]: ['ENROLLED', 'FINANCE_APPROVED', 'PAYMENT_VERIFIED', 'OPS_APPROVED'] }
      },
      attributes: ['id', 'uid', 'name'],
      include: [
        {
          model: Mark,
          as: 'examMarks',
          where: { subjectName: subjectName || { [Op.ne]: null } },
          required: false
        }
      ]
    });

    res.json(students);
  } catch (error) {
    console.error('Grading roster failure:', error);
    res.status(500).json({ error: 'Failed to generate institutional grading roster' });
  }
});

// --- MULTI-DEPARTMENT ASSESSMENT PROTOCOLS ---

router.get(['/marks/grading-roster', '/internal-marks/roster'], verifyToken, async (req, res) => {
  try {
    const { programId, sessionId, subjectName, subjectId, centerId: queryCenterId } = req.query;
    const subject = subjectName || subjectId;
    const role = req.user.role?.toLowerCase();
    
    let whereClause = { 
        programId, 
        sessionId,
        status: { [Op.in]: ['ENROLLED', 'FINANCE_APPROVED', 'PAYMENT_VERIFIED', 'OPS_APPROVED'] }
    };

    // Role-based Jurisdictional Filtering
    const normalizedRole = role?.replace(/-/g, ' ');
    if (normalizedRole === 'partner center' || normalizedRole === 'study center') {
      let centerId = req.user.deptId;
      if (!centerId) {
        const center = await Department.findOne({ where: { adminId: req.user.uid, type: 'partner-center' } });
        if (center) centerId = center.id;
      }
      if (!centerId) return res.status(403).json({ error: 'Jurisdictional Error: Center ID not resolved' });
      whereClause.centerId = centerId;
    } else if (['Open School Admin', 'Online Department Admin', 'Skill Department Admin', 'BVoc Department Admin'].includes(role) || req.user.subDepartment) {
      const subDeptId = getSubDeptId(req.user);
      if (subDeptId) whereClause.subDepartmentId = subDeptId;
    } else if (['Operations Admin', 'Organization Admin'].includes(role)) {
       // Operations/Admin: Filter by specific center if requested, otherwise global view
       if (queryCenterId && queryCenterId !== 'all') whereClause.centerId = queryCenterId;
    } else {
      return res.status(403).json({ error: 'Access denied: Role not authorized for assessment review' });
    }

    if (!programId || !sessionId) {
      return res.status(400).json({ error: 'Missing mandatory grading context (Program/Batch)' });
    }

    const students = await Student.findAll({
      where: whereClause,
      attributes: ['id', 'uid', 'name'],
      include: [
        {
          model: Mark,
          as: 'examMarks',
          where: { subjectName: subject || { [Op.ne]: null } },
          required: false
        }
      ]
    });

    res.json(students);
  } catch (error) {
    console.error('Unified grading roster failure:', error);
    res.status(500).json({ error: 'Failed to synchronize institutional grading roster' });
  }
});

router.post('/marks/bulk', verifyToken, async (req, res) => {
  try {
    const { programId, sessionId, subjectName, marks } = req.body;
    const role = req.user.role?.toLowerCase();

    // Restriction: Operations/Academic cannot edit marks (Read-only as per User Rule)
        return res.status(403).json({ error: 'Governance Error: Central Operations retains read-only oversight for assessments.' });

    // 1. Identify or Create an Exam record to anchor these marks
    const [exam] = await Exam.findOrCreate({
      where: { 
        programId, 
        sessionId, 
        name: `Internal Assessment - ${subjectName}`,
      },
      defaults: {
        batch: new Date().getFullYear().toString(),
        status: 'published'
      }
    });

    // 2. Transactional Upsert
    await sequelize.transaction(async (t) => {
      for (const entry of marks) {
        // Jurisdictional Verification: Ensure the student exists within the caller's territory
        const verifyWhere = { id: entry.studentId };
        const normalizedRole = role?.replace(/-/g, ' ');
        if (normalizedRole === 'partner center' || normalizedRole === 'study center') {
           verifyWhere.centerId = req.user.deptId;
        } else if (['Open School Admin', 'Online Department Admin', 'Skill Department Admin', 'BVoc Department Admin'].includes(role)) {
           verifyWhere.subDepartmentId = getSubDeptId(req.user);
        }

        const student = await Student.findOne({ where: verifyWhere, transaction: t });
        if (!student) continue; // Skip unauthorized/missing students

        const [mark, created] = await Mark.findOrCreate({
          where: { 
            studentId: entry.studentId, 
            examId: exam.id, 
            subjectName 
          },
          defaults: {
            internalMarks: entry.internalMarks || 0,
            totalMarks: entry.internalMarks || 0
          },
          transaction: t
        });

        if (!created) {
          await mark.update({ 
            internalMarks: entry.internalMarks,
            totalMarks: entry.internalMarks 
          }, { transaction: t });
        }
      }
    });

    res.json({ message: `Institutional Ledger Synchronized: ${marks.length} assessments published.` });
  } catch (error) {
    console.error('Unified bulk grading failure:', error);
    res.status(500).json({ error: 'Failed to commit marks to institutional record' });
  }
});

// --- SALES PORTAL (CRM INTAKE PLACEHOLDER) ---
router.get('/sales/leads', verifyToken, requireRole('Sales & CRM Admin'), async (req, res) => {
  // Placeholder for robust CRM features
  res.json([]);
});

export default router;
