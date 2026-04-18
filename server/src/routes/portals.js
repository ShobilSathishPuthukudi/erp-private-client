import express from 'express';
import { models } from '../models/index.js';
import { verifyToken } from '../middleware/verifyToken.js';
import sequelize from '../config/db.js';
import { Op } from 'sequelize';
import erpEvents from '../lib/events.js';
import { getSubDepartmentNameAliases, normalizeInstitutionRoleName } from '../config/institutionalStructure.js';

const router = express.Router();
const { Student, AdmissionSession, Invoice, Task, Leave, Department, Program, User, ProgramFee, AccreditationRequest, ProgramOffering, CenterProgram, Payment, Notification, Subject, Mark, Exam, EmployeeHRRequest } = models;
import { createNotification } from './notifications.js';

const getSubDeptId = (user) => {
  if (!user) return null;
  if (user.deptId || user.departmentId) return user.deptId || user.departmentId;
  const unitStr = (user.subDepartment || user.role || '').toLowerCase();
  if (unitStr.includes('open school')) return 8;
  if (unitStr.includes('online')) return 9;
  if (unitStr.includes('skill')) return 10;
  if (unitStr.includes('bvoc')) return 11;
  return null;
};

const isCenterEditLocked = (student) => {
  if (!student) return true;

  const lockedStatuses = ['OPS_APPROVED', 'FINANCE_PENDING', 'PAYMENT_VERIFIED', 'FINANCE_APPROVED', 'ENROLLED'];
  const lockedEnrollStatuses = ['pending_finance', 'rejected'];

  return lockedStatuses.includes(student.status) || lockedEnrollStatuses.includes(student.enrollStatus);
};

const LEGACY_SUB_DEPT_NAME_BY_ID = {
  8: 'Open School',
  9: 'Online',
  10: 'Skill',
  11: 'BVoc'
};

const resolveSubDeptDepartmentId = async ({ rawSubDeptId, programType }) => {
  if (rawSubDeptId) {
    const subDept = await Department.findByPk(rawSubDeptId);
    if (subDept?.type === 'sub-departments') {
      return subDept.id;
    }
  }

  const normalizedProgramType = String(programType || '').toLowerCase().trim();
  const lookupName =
    LEGACY_SUB_DEPT_NAME_BY_ID[rawSubDeptId] ||
    (normalizedProgramType.includes('open') ? 'Open School' :
      normalizedProgramType.includes('online') ? 'Online' :
      normalizedProgramType.includes('skill') ? 'Skill' :
      normalizedProgramType.includes('bvoc') ? 'BVoc' :
      null);

  if (!lookupName) return null;

  const subDept = await Department.findOne({
    where: {
      type: 'sub-departments',
      name: { [Op.in]: getSubDepartmentNameAliases(lookupName) }
    },
    order: [['id', 'ASC']]
  });

  return subDept?.id || null;
};

const requireRole = (role) => (req, res, next) => {
  const userRole = normalizeInstitutionRoleName(req.user.role || '').toLowerCase().trim();
  const targetRole = normalizeInstitutionRoleName(role || '').toLowerCase().trim();

  // Support legacy, plural, and alias formats (Institutional Standardization)
  const normalize = (r) => {
    if (!r) return '';
    let res = r.replace(/-/g, ' ').toLowerCase().trim();
    if (res.endsWith('s')) res = res.slice(0, -1); // Basic singularization for cross-match
    if (res === 'study center') return 'partner center';
    return res;
  };

  const normalizedUserRole = normalize(userRole);
  const normalizedTargetRole = normalize(targetRole);
  const isEmployeeLike =
    normalizedTargetRole === 'employee' &&
    ['employee', 'hr', 'finance', 'sales', 'operations', 'academic operation'].includes(normalizedUserRole);

  const isMatch = normalizedUserRole === normalizedTargetRole || isEmployeeLike;

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

    if (center.status !== 'active') {
        return res.status(403).json({ error: 'Admissions halted: Partner center is not currently in an active state.' });
    }

    // --- Phase 3 & 5: Center-Program Mapping Validation ---
    const mapping = await CenterProgram.findOne({ 
        where: { centerId: center.id, programId, isActive: true } 
    });
    if (!mapping) {
        return res.status(403).json({ error: 'This center is not authorized to execute enrollment protocols for the requested program framework' });
    }

    const program = await Program.findByPk(programId);
    if (!program) return res.status(404).json({ error: 'Program framework not found' });
    const resolvedSubDeptId = await resolveSubDeptDepartmentId({
      rawSubDeptId: mapping.subDeptId ?? program.subDeptId,
      programType: program.type
    });

    if (!resolvedSubDeptId) {
        return res.status(400).json({ error: 'Academic unit mapping is incomplete for this program. Please contact Academic Operations.' });
    }

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
        subDepartmentId: resolvedSubDeptId,
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
      const opsNotificationRoles = [
        'Academic Operations',
        'Academic Operations Admin',
        'Academic Operations Administrator',
        'Operations Admin',
        'Operations Administrator',
        'Organization Admin'
      ];

      const opsUsers = await User.findAll({ 
        where: { 
          role: { [Op.in]: opsNotificationRoles },
          status: 'active'
        } 
      });
      
      for (const ops of opsUsers) {
        await createNotification(req.io, {
          targetUid: ops.uid,
          title: `New Enrollment: ${result.student.name}`,
          message: `Partner Center ${center.name} has submitted a new enrollment application for review.`,
          type: 'info',
          link: '/dashboard/operations/pending-reviews?tab=pending',
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
    
    if (isCenterEditLocked(student)) {
      return res.status(400).json({ error: 'Governance Error: Center editing is locked once Academic Operations has verified this student record.' });
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
import { augmentTaskCollection } from '../utils/taskAugmentation.js';

router.get('/employee/tasks', verifyToken, requireRole('employee'), async (req, res) => {
  try {
    const tasksRaw = await Task.findAll({
      where: { assignedTo: req.user.uid },
      include: [{ model: User, as: 'assigner', attributes: ['name', 'uid'] }],
      order: [['deadline', 'ASC']]
    });

    const tasks = augmentTaskCollection(tasksRaw);
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
        type: { [Op.in]: ['partner-center', 'partner centers'] }
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

    const today = new Date();
    const todayLocal = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split('T')[0];

    if (!fromDate || !toDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    if (fromDate < todayLocal || toDate < todayLocal) {
      return res.status(400).json({ error: 'Previous dates are not allowed for leave requests' });
    }

    if (toDate <= fromDate) {
      return res.status(400).json({ error: 'End date must be after start date' });
    }
    
    // Strict two-step workflow: every employee leave starts with department admin review.
    const initialStatus = 'pending admin';

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
      const employee = await User.findOne({ where: { uid: req.user.uid } });
      const employeeName = employee?.name || req.user.uid;

      const resolveLeaveLinkForRole = (role) => {
        const r = (role || '').toLowerCase().trim();
        if (r.includes('open school') || r.includes('openschool')) return '/dashboard/subdept/openschool/leave-status';
        if (r.includes('online')) return '/dashboard/subdept/online/leave-status';
        if (r.includes('skill')) return '/dashboard/subdept/skill/leave-status';
        if (r.includes('bvoc')) return '/dashboard/subdept/bvoc/leave-status';
        if (r.includes('hr')) return '/dashboard/hr/dept-leave-status';
        if (r.includes('sales')) return '/dashboard/sales/leave-status';
        if (r.includes('finance')) return '/dashboard/finance/leave-status';
        if (r.includes('operations') || r.includes('academic')) return '/dashboard/operations/leave-status';
        return '/dashboard/tasks';
      };

      const notifyAdminUid = async (uid) => {
        const target = await User.findByPk(uid);
        if (!target || target.status !== 'active') return;
        await createNotification(req.io, {
          targetUid: uid,
          title: 'New Team Leave Request',
          message: `${employeeName} is requesting ${type} (${fromDate} to ${toDate}).`,
          type: 'info',
          link: resolveLeaveLinkForRole(target.role)
        });
      };

      if (initialStatus === 'pending admin') {
        // Unit-level admin (BVoc/Online/Skill/Open School) whose Department row
        // matches the employee's subDepartment takes precedence over the parent
        // dept's admin — they are the actual Step-1 reviewer.
        const recipientUids = new Set();

        if (employee?.subDepartment) {
          const aliases = getSubDepartmentNameAliases(employee.subDepartment);
          if (aliases?.length) {
            const unitDept = await Department.findOne({
              where: { name: { [Op.in]: aliases } },
              attributes: ['adminId']
            });
            if (unitDept?.adminId) recipientUids.add(unitDept.adminId);
          }
        }

        if (!recipientUids.size && employee?.deptId) {
          const dept = await Department.findByPk(employee.deptId, { attributes: ['adminId'] });
          if (dept?.adminId) recipientUids.add(dept.adminId);
        }

        if (employee?.reportingManagerUid) {
          recipientUids.add(employee.reportingManagerUid);
        }

        // Fallback: no admin/manager resolvable — ping all active HR Admins so
        // the request isn't silently orphaned when a dept admin slot is empty.
        if (!recipientUids.size) {
          console.warn(`[LEAVE-NOTIFY] No dept admin/manager resolvable for employee ${req.user.uid} (deptId=${employee?.deptId}, subDept=${employee?.subDepartment}). Falling back to HR Admins.`);
          const hrAdmins = await User.findAll({
            where: { role: 'HR Admin', status: 'active' },
            attributes: ['uid']
          });
          hrAdmins.forEach((hr) => recipientUids.add(hr.uid));
        }

        for (const uid of recipientUids) {
          await notifyAdminUid(uid);
        }
      }

      if (initialStatus === 'pending hr') {
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
    
    if (leave.status !== 'pending admin') {
      return res.status(400).json({ error: 'Only pending requests can be deleted' });
    }

    await leave.destroy();
    res.json({ message: 'Leave request deleted successfully' });
  } catch (error) {
    console.error('Delete leave error:', error);
    res.status(500).json({ error: 'Failed to delete leave request' });
  }
});

router.get('/employee/hr-requests', verifyToken, async (req, res) => {
  try {
    if (!req.user?.uid) {
      return res.status(401).json({ error: 'Access denied: Missing user identity' });
    }

    const requests = await EmployeeHRRequest.findAll({
      where: { employeeId: req.user.uid },
      order: [['createdAt', 'DESC']]
    });

    let enrichedRequests = requests.map((request) => ({
      ...request.toJSON(),
      responder: null
    }));

    try {
      const responderIds = [...new Set(requests.map((request) => request.respondedBy).filter(Boolean))];
      const responders = responderIds.length
        ? await User.findAll({
            where: { uid: { [Op.in]: responderIds } },
            attributes: ['uid', 'name']
          })
        : [];

      const responderMap = new Map(responders.map((responder) => [responder.uid, responder]));
      enrichedRequests = requests.map((request) => {
        const requestJson = request.toJSON();
        const responder = request.respondedBy ? responderMap.get(request.respondedBy) : null;

        return {
          ...requestJson,
          responder: responder ? {
            uid: responder.uid,
            name: responder.name
          } : null
        };
      });
    } catch (enrichmentError) {
      console.error('Employee HR request enrichment fallback activated:', enrichmentError);
    }

    res.json(enrichedRequests);
  } catch (error) {
    console.error('Fetch employee HR requests error:', error);
    res.json([]);
  }
});

router.post('/employee/hr-requests', verifyToken, async (req, res) => {
  try {
    if (!req.user?.uid) {
      return res.status(401).json({ error: 'Access denied: Missing user identity' });
    }

    const { subject, category, message } = req.body;

    if (!subject?.trim() || !message?.trim()) {
      return res.status(400).json({ error: 'Subject and message are required' });
    }

    const requestPayload = {
      employeeId: req.user.uid,
      subject: subject.trim(),
      category: category || 'general',
      message: message.trim()
    };

    let request;
    try {
      request = await EmployeeHRRequest.create(requestPayload);
    } catch (createError) {
      console.error('Employee HR request initial create failed, attempting schema sync:', createError);
      await EmployeeHRRequest.sync({ alter: true });
      request = await EmployeeHRRequest.create(requestPayload);
    }

    let employee = null;
    try {
      employee = await User.findOne({
        where: { uid: req.user.uid },
        include: [{ model: Department, as: 'department', attributes: ['name'], required: false }]
      });
    } catch (employeeLookupError) {
      console.error('Employee HR request employee lookup fallback activated:', employeeLookupError);
    }

    try {
      const hrUsers = await User.findAll({
        where: {
          status: 'active',
          role: 'HR Admin'
        },
        attributes: ['uid']
      });

      for (const hr of hrUsers) {
        await createNotification(req.io, {
          targetUid: hr.uid,
          title: 'New Employee HR Request',
          message: `${employee?.name || req.user.uid} submitted "${subject.trim()}" from ${employee?.department?.name || 'their department'}.`,
          type: 'info',
          link: '/dashboard/hr/employee-communications'
        });
      }
    } catch (notificationError) {
      console.error('Employee HR request notification fallback activated:', notificationError);
    }

    res.status(201).json({ message: 'Your HR request has been sent successfully', request });
  } catch (error) {
    console.error('Create employee HR request error:', error);
    res.status(500).json({ error: 'Failed to send HR request' });
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
    const canonicalRole = normalizeInstitutionRoleName(req.user.role || '');
    
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
        const center = await Department.findOne({
          where: {
            adminId: req.user.uid,
            type: { [Op.in]: ['partner-center', 'partner center', 'partner centers', 'study-center', 'study centers'] }
          }
        });
        if (center) centerId = center.id;
      }
      if (!centerId) return res.status(403).json({ error: 'Jurisdictional Error: Center ID not resolved' });
      whereClause.centerId = centerId;
    } else if (['Open School Admin', 'Online Admin', 'Skill Admin', 'BVoc Admin'].includes(canonicalRole) || req.user.subDepartment) {
      const subDeptId = getSubDeptId(req.user);
      if (subDeptId) whereClause.subDepartmentId = subDeptId;
    } else if (['Operations Admin', 'Organization Admin', 'Academic Operations Admin'].includes(canonicalRole)) {
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
    const canonicalRole = normalizeInstitutionRoleName(req.user.role || '');

    // Restriction: Operations/Academic cannot edit marks (Read-only as per User Rule)
    if (['Operations Admin', 'Organization Admin', 'Academic Operations Admin'].includes(canonicalRole)) {
      return res.status(403).json({ error: 'Governance Error: Central Operations retains read-only oversight for assessments.' });
    }

    if (!programId || !sessionId || !subjectName || !Array.isArray(marks) || marks.length === 0) {
      return res.status(400).json({ error: 'Missing mandatory grading payload (Program/Batch/Subject/Marks).' });
    }

    let centerId = req.user.deptId;
    if (!centerId && (role === 'partner center' || role === 'study center')) {
      const center = await Department.findOne({
        where: {
          adminId: req.user.uid,
          type: { [Op.in]: ['partner-center', 'partner center', 'partner centers', 'study-center', 'study centers'] }
        }
      });
      if (center) centerId = center.id;
    }

    const normalizedRole = role?.replace(/-/g, ' ');
    const isCenterRole = normalizedRole === 'partner center' || normalizedRole === 'study center';
    const isSubDeptRole = ['Open School Admin', 'Online Admin', 'Skill Admin', 'BVoc Admin'].includes(canonicalRole);

    if (!isCenterRole && !isSubDeptRole) {
      return res.status(403).json({ error: 'Access denied: Role not authorized for assessment publishing' });
    }

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
        if (isCenterRole) {
           if (!centerId) {
             throw new Error('Partner center jurisdiction could not be resolved for marks publishing');
           }
           verifyWhere.centerId = centerId;
        } else if (isSubDeptRole) {
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
