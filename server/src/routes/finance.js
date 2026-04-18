import express from 'express';
import { models, sequelize } from '../models/index.js';
import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import { verifyToken } from '../middleware/verifyToken.js';
import validate from '../middleware/validate.js';
import { paymentSchema } from '../lib/schemas.js';
import { logAction } from '../lib/audit.js';
import { requireMandatoryRemarks } from '../middleware/auditMiddleware.js';
import erpEvents from '../lib/events.js';
import { checkPermission } from '../middleware/rbac.js';
import { clearNotifications } from './notifications.js';

const router = express.Router();
const { Payment, Invoice, Student, AuditLog, ChangeRequest, AdmissionSession, Department, Program, User, CenterProgram, ProgramFee, AcademicActionRequest, Subject, Module, CredentialRequest, Role, Notification, ReregRequest, IncentiveRule, IncentivePayout, PaymentDistribution } = models;

const isFinanceOrAdmin = (req, res, next) => {
  const userRole = req.user.role?.toLowerCase()?.trim();
  const allowed = ['Finance Admin', 'Organization Admin'];
  const normalizedAllowed = allowed.map(r => r.toLowerCase());
  
  if (!normalizedAllowed.includes(userRole)) {
    return res.status(403).json({ error: 'Access denied: Finance privileges required' });
  }
  next();
};

// Enforce mandatory remarks for all EDIT/DELETE actions in this module
router.use(['/payments/:id', '/invoices/:id', '/students/:id/verify-fee', '/centers/:centerId/programs/:programId/assign-fee', '/academic-action-requests/:id/approve'], requireMandatoryRemarks);

// ==========================================
// ACADEMIC ACTION REQUESTS (GOVERNANCE)
// ==========================================

router.get('/academic-action-requests', verifyToken, isFinanceOrAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    const requests = await AcademicActionRequest.findAll({
      where: status ? { status } : {},
      include: [
        { model: User, as: 'requester', attributes: ['name', 'role'] },
        { model: User, as: 'approver', attributes: ['name'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch academic action requests' });
  }
});

router.put('/academic-action-requests/:id/approve', verifyToken, isFinanceOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;
    
    const request = await AcademicActionRequest.findByPk(id);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.status !== 'pending') return res.status(400).json({ error: 'Protocol Conflict: Request already processed' });

    // 1. Resolve and Execute the requested action
    let entityName = request.entityType;
    if (entityName === 'University') entityName = 'Department';
    
    const EntityModel = models[entityName];
    if (!EntityModel) return res.status(500).json({ error: `System Error: Model [${entityName}] not found in registry.` });

    const instance = await EntityModel.findByPk(request.entityId);
    
    if (instance) {
      if (request.actionType === 'DELETE') {
        await instance.destroy();
      } else if (request.actionType === 'EDIT') {
        const updateData = request.proposedData || {};
        await instance.update(updateData);
      }
    } else if (request.actionType === 'EDIT') {
        return res.status(404).json({ error: `Governance Error: Target entity [${request.entityType} ID: ${request.entityId}] no longer exists.` });
    }

    // 2. Finalize request status
    await request.update({ 
      status: 'approved', 
      approvedBy: req.user.uid,
      financeRemarks: remarks
    });

    await logAction({
       userId: req.user.uid,
       action: `APPROVE_${request.actionType}`,
       entity: request.entityType,
       details: `Finance approved ${request.actionType} for ${request.entityType} ID: ${request.entityId}. Remarks: ${remarks}`,
       module: 'Finance'
    });

    res.json({ message: 'Institutional action executed and recorded.', request });
  } catch (error) {
    console.error('Approval execution error:', error);
    res.status(500).json({ error: 'Failed to execute requested institutional action' });
  }
});

router.put('/academic-action-requests/:id/reject', verifyToken, isFinanceOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;
    
    const request = await AcademicActionRequest.findByPk(id);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.status !== 'pending') return res.status(400).json({ error: 'Protocol Conflict: Request already processed' });

    await request.update({ 
      status: 'rejected', 
      approvedBy: req.user.uid,
      financeRemarks: remarks
    });

    await logAction({
       userId: req.user.uid,
       action: `REJECT_${request.actionType}`,
       entity: request.entityType,
       details: `Finance rejected ${request.actionType} for ${request.entityType} ID: ${request.entityId}. Remarks: ${remarks}`,
       module: 'Finance'
    });

    res.json({ message: 'Institutional action rejected.', request });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reject action request' });
  }
});

router.get('/payments', verifyToken, checkPermission('FIN_PAY_VERIFY', 'read'), async (req, res) => {
  try {
    const { permissionFilter } = req;
    
    // Joint filter: Apply scope restrictions via student relationship if scoped
    const payments = await Payment.findAll({
      include: [
        { 
          model: Student, 
          as: 'student', 
          attributes: ['id', 'name', 'email', 'uid', 'enrollStatus', 'deptId', 'centerId'],
          required: true, // Enforcement: Must have student data for scope check
          where: permissionFilter, // Apply scope filter here (deptId/centerId mapping)
          include: [
            { model: Program, attributes: ['id', 'name', 'shortName'] },
            { model: Department, as: 'center', attributes: ['id', 'name', 'shortName'] }
          ]
        }
      ],
      order: [['date', 'DESC']]
    });
    res.json(payments || []);
  } catch (error) {
    console.error("ERROR:", error);
    res.status(500).json({ message: error.message || "Internal Server Error" });
  }
});

router.post('/payments', verifyToken, checkPermission('FIN_PAY_VERIFY', 'create'), validate(paymentSchema), async (req, res) => {
  try {
    const { studentId, amount, mode, status } = req.body;
    
    const payment = await Payment.create({
      studentId,
      amount,
      mode,
      status: status || 'pending',
      date: new Date()
    });

    await logAction({
       userId: req.user.uid,
       action: 'CREATE',
       entity: 'Payment',
       details: `Recorded payment of ₹${payment.amount} for student ${payment.studentId}`,
       module: 'Finance'
    });

    res.status(201).json(payment);
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

// --- Center-Program Fee Assignment (Phase 3) ---
router.post('/centers/:centerId/programs/:programId/assign-fee', verifyToken, checkPermission('FIN_FEE_MAP', 'create'), async (req, res) => {
  try {
    const { centerId, programId } = req.params;
    const { feeSchemaId, remarks } = req.body;

    const mapping = await CenterProgram.findOne({ where: { centerId, programId } });
    if (!mapping) return res.status(404).json({ error: 'Governance Error: Center-Program mapping not authorized by Operations yet.' });

    const feeSchema = await ProgramFee.findByPk(feeSchemaId);
    if (!feeSchema || feeSchema.programId != programId) {
        return res.status(400).json({ error: 'Validation Error: Mismatched or non-existent fee schema for this program architecture.' });
    }

    const previousSchemaId = mapping.feeSchemaId;
    await mapping.update({ feeSchemaId });
    
    // Explicit Audit
    await AuditLog.create({
        entity: 'CenterProgram',
        action: 'ASSIGN_FEE_SCHEMA',
        userId: req.user.uid,
        before: { feeSchemaId: previousSchemaId },
        after: { feeSchemaId },
        remarks: remarks || 'Initial institutional fee assignment',
        module: 'Finance'
    });

    res.json({ message: 'Institutional Fee structure successfully synchronized with center mapping', mapping });
  } catch (error) {
    console.error('Fee assignment error:', error);
    res.status(500).json({ error: 'Failed to synchronize institutional fee structure' });
  }
});

router.post('/payments/:id/verify', verifyToken, checkPermission('FIN_PAY_VERIFY', 'approve'), async (req, res) => {
  try {
    const { id } = req.params;
    const payment = await Payment.findByPk(id);
    
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    if (payment.status === 'verified') return res.status(400).json({ error: 'Payment has already been verified previously' });

    // Mark as verified
    await payment.update({ 
      status: 'verified', 
      verifiedBy: req.user.uid 
    });

    // GAP-1: Automatically Generate/Sync Issue Record
    // Check if an invoice already exists for this payment (e.g. from Admission flow)
    let invoice = await Invoice.findOne({ where: { paymentId: payment.id } });
    let invoiceNo = invoice?.invoiceNo;

    if (!invoice) {
        const gstRate = 0.18; // Fixed 18% tax simulation
        const amountVal = parseFloat(payment.amount);
        const gstVal = amountVal * gstRate;
        const totalVal = amountVal + gstVal;
        
        invoiceNo = `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;

        invoice = await Invoice.create({
          paymentId: payment.id,
          studentId: payment.studentId,
          invoiceNo,
          amount: amountVal,
          gst: gstVal,
          total: totalVal,
          status: 'issued',
          centerId: (await Student.findByPk(payment.studentId))?.centerId
        });
    } else {
        // Update existing invoice status if needed
        if (invoice.status === 'issued') {
            await invoice.update({ status: 'paid' });
        }
    }

    // Ensure transaction is permanently recorded globally
    await AuditLog.create({
      entity: 'Payment/Invoice',
      action: 'VERIFY_AND_INVOICE',
      userId: req.user.uid,
      before: { paymentStatus: 'pending' },
      after: { paymentStatus: 'verified', invoiceId: invoice.id, invoiceNo },
      module: 'Finance'
    });

    // Notify Student of Invoice Generation
    if (req.io) {
      req.io.emit('notification', {
        targetUid: `STU${payment.studentId}`,
        title: 'New Invoice Generated',
        message: `Invoice ${invoiceNo} for ₹${totalVal} has been successfully recorded.`,
        type: 'info'
      });
    }

    // Transition student status to ENROLLED if their payment is verified (Final Institutional Enrollment Gate)
    const student = await Student.findByPk(payment.studentId);
    if (student) {
        await student.update({ 
          status: 'ENROLLED',
          enrollStatus: 'enrolled' 
        });
        
        // Emit Institutional Event
        erpEvents.emit('FINANCE_APPROVED', { 
            studentId: student.id, 
            paymentId: payment.id, 
            invoiceNo: invoice.invoiceNo 
        });
    }

    res.json({ message: 'Institutional Payment verified. Enrollment Status: ACTIVE.', payment, invoice });
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ error: 'Failed to verify payment and process invoice' });
  }
});

// --- Institutional Adjustments & Recalculation ---

router.put('/students/:id/adjust-fee', verifyToken, isFinanceOrAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { adjustmentAmount, type, remarks } = req.body; // type: 'discount' or 'penalty'
        
        if (!remarks || remarks.length < 12) {
            return res.status(400).json({ error: 'Governance Guardrail: Fee adjustments require forensic remarks (min 12 chars).' });
        }

        const student = await Student.findByPk(id);
        if (!student) return res.status(404).json({ error: 'Student not located.' });

        const adjustment = parseFloat(adjustmentAmount);
        const currentPending = parseFloat(student.pendingAmount || 0);
        
        let nextPending = currentPending;
        if (type === 'discount') nextPending = Math.max(0, currentPending - adjustment);
        else if (type === 'penalty') nextPending = currentPending + adjustment;

        await student.update({ pendingAmount: nextPending });

        await logAction({
            userId: req.user.uid,
            action: `FEE_ADJUSTMENT_${type.toUpperCase()}`,
            entity: 'Student',
            details: `Adjusted fee for ${student.name} by ₹${adjustment} (${type}). New Pending: ₹${nextPending}`,
            module: 'Finance',
            remarks
        });

        res.json({ message: `Institutional fee ${type} recorded. Billing recalculated.`, student });
    } catch (error) {
        res.status(500).json({ error: 'Fee adjustment protocol failure.' });
    }
});

// --- Institutional Distributions & Splits ---

router.post('/payments/:id/distribute', verifyToken, isFinanceOrAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const payment = await Payment.findByPk(id);
        if (!payment || payment.status !== 'verified') {
            return res.status(400).json({ error: 'Operational Block: Only Verified payments can be distributed.' });
        }

        const amount = parseFloat(payment.amount);
        
        // Institutional Split Logic (Simulated 30/20/50)
        const splits = [
            { type: 'university', amount: amount * 0.30, id: 'UNIV_CORE' },
            { type: 'platform', amount: amount * 0.20, id: 'HEI_ORG_HQ' },
            { type: 'partner', amount: amount * 0.50, id: (await Student.findByPk(payment.studentId))?.centerId?.toString() || 'EXT_CENTER' }
        ];

        for (const split of splits) {
            await PaymentDistribution.create({
                paymentId: payment.id,
                partnerType: split.type,
                partnerId: split.id,
                amount: split.amount,
                status: 'distributed',
                distributionDate: new Date()
            });
        }

        await payment.update({ isDistributed: true });

        res.json({ message: 'Institutional split executed successfully.', splits });
    } catch (error) {
        res.status(500).json({ error: 'Distribution protocol failure.' });
    }
});

// --- Growth & Incentive Engine ---

router.post('/incentives/calculate', verifyToken, isFinanceOrAdmin, async (req, res) => {
    try {
        const { period, bdeId } = req.body; // period: "2026-04"
        
        const bde = await User.findByPk(bdeId);
        if (!bde) return res.status(404).json({ error: 'Member not found.' });

        const rule = await IncentiveRule.findOne({ where: { targetId: 1, isActive: true } }); // Default institutional baseline rule
        if (!rule) return res.status(400).json({ error: 'Configuration Error: No active incentive rules located.' });

        // Calculate total collections for this BDE in the period
        const start = new Date(`${period}-01T00:00:00Z`);
        const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59);

        // 🎯 Institutional Accuracy: Aggregation without JOIN to satisfy ONLY_FULL_GROUP_BY
        const bdeStudents = await Student.findAll({ where: { bdeId }, attributes: ['id'] });
        const studentIds = bdeStudents.map(s => s.id);

        const totalCollected = studentIds.length > 0 ? await Payment.sum('amount', {
            where: {
                status: 'verified',
                studentId: studentIds, // Sequelize translates this to IN (...)
                createdAt: { [Op.between]: [start, end] }
            }
        }) : 0;

        // Apply Brackets (Rule.structure: [{ achievement: 100000, reward: 5000 }, ...])
        let payoutAmount = 0;
        const brackets = rule.structure || [];
        brackets.sort((a, b) => b.achievement - a.achievement); // High to low

        const matchedBracket = brackets.find(b => totalCollected >= b.achievement);
        if (matchedBracket) {
            payoutAmount = matchedBracket.reward;
        }

        const payout = await IncentivePayout.create({
            userId: bdeId,
            ruleId: rule.id,
            amount: payoutAmount,
            achievementPercentage: (totalCollected / (brackets[0]?.achievement || 1)) * 100,
            period,
            status: 'pending_ceo'
        });

        res.json({ message: `Incentive calculated for ${period}. Payout: ₹${payoutAmount}`, payout });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Incentive engine protocol failure.", message: error.message });
    }
});

// --- Reregistration Verification ---

router.put('/rereg-requests/:id/approve', verifyToken, isFinanceOrAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { remarks } = req.body;

        const request = await ReregRequest.findByPk(id);
        if (!request) return res.status(404).json({ error: 'Request not found.' });

        const student = await Student.findByPk(request.studentId);
        
        // Eligibility check
        if (student.feeStatus !== 'PAID' && student.pendingAmount > 0) {
            return res.status(400).json({ error: 'Financial Block: Student has pending arrears. Reregistration forbidden.' });
        }

        await request.update({ status: 'approved', financeRemarks: remarks });
        await student.update({
            reregStatus: 'approved',
            reregStage: 2, // Finance Verified
            currentSemester: student.currentSemester + 1
        });

        res.json({ message: 'Institutional progression approved. Semester incremented.', student });
    } catch (error) {
        res.status(500).json({ error: 'Reregistration approval protocol failure.' });
    }
});

router.post('/student/pay-invoice/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const studentIdStr = req.user.uid.replace('STU', '');
    const studentId = parseInt(studentIdStr);

    const invoice = await Invoice.findOne({ where: { id, studentId } });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found or unauthorized' });

    if (invoice.status === 'paid') return res.status(400).json({ error: 'Invoice is already paid' });

    await invoice.update({ status: 'paid' });
    
    // Also update student pending amount if tracked
    const student = await Student.findByPk(studentId);
    if (student) {
        const paid = parseFloat(student.paidAmount || 0) + parseFloat(invoice.total);
        const pending = Math.max(0, parseFloat(student.pendingAmount || 0) - parseFloat(invoice.total));
        await student.update({ paidAmount: paid, pendingAmount: pending });
    }

    await logAction({
      userId: req.user.uid,
      action: 'PAYMENT',
      entity: 'Invoice',
      details: `Student paid invoice ${invoice.invoiceNo} for ₹${invoice.total}`,
      module: 'Finance'
    });

    res.json({ message: 'Payment processed successfully within the institutional ledger.', invoice });
  } catch (error) {
    console.error('Student payment error:', error);
    res.status(500).json({ error: 'Payment gateway simulation failed' });
  }
});

// --- Historical Ledger & Requests ---

router.get('/invoices', verifyToken, isFinanceOrAdmin, async (req, res) => {
  try {
    console.log("[FINANCE] Fetching all invoices...");
    const invoices = await Invoice.findAll({
      include: [
        { 
          model: Student, 
          as: 'student', 
          attributes: ['id', 'name', 'email'], 
          required: false 
        },
        { 
          model: Payment, 
          attributes: ['id', 'amount', 'mode', 'transactionId', 'receiptUrl'], 
          required: false 
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(invoices || []);
  } catch (error) {
    console.error("[FINANCE_ERROR] GET /invoices failure:", error);
    res.status(500).json({ error: 'Failed to fetch invoices', message: error.message });
  }
});

router.get('/change-requests', verifyToken, isFinanceOrAdmin, async (req, res) => {
  try {
    const requests = await ChangeRequest.findAll({
      where: { status: 'pending_finance' },
      include: [
        { model: Department, as: 'center', attributes: ['name'], required: false },
        { model: Program, as: 'currentProgram', attributes: ['name'], required: false },
        { model: Program, as: 'requestedProgram', attributes: ['name'], required: false }
      ]
    });
    res.json(requests || []);
  } catch (error) {
    console.error("ERROR:", error);
    res.status(500).json({ message: error.message || "Internal Server Error" });
  }
});

router.get('/admission-sessions', verifyToken, isFinanceOrAdmin, async (req, res) => {
  try {
    const sessions = await AdmissionSession.findAll({
       where: { financeStatus: 'pending' },
       include: [
         { model: Department, as: 'subDept', attributes: ['name'], required: false },
         { model: Program, attributes: ['name'], required: false }
       ]
    });
    res.json(sessions || []);
  } catch (error) {
    console.error("ERROR:", error);
    res.status(500).json({ message: error.message || "Internal Server Error" });
  }
});

// --- Institutional Approval Queues ---

// GET Student Approval Queue (Finance View)
router.get('/approvals/students', verifyToken, isFinanceOrAdmin, async (req, res) => {
    try {
      console.log("[FINANCE] Fetching student approval queue (Status: OPS_APPROVED)...");
      const { type } = req.query;
    let whereClause = { status: { [Op.in]: ['FINANCE_PENDING', 'PAYMENT_VERIFIED'] } };
    
    if (type === 'approved') {
        whereClause = { status: 'ENROLLED' };
    }

    const students = await Student.findAll({
        where: whereClause,
        include: [
          { model: Program, attributes: ['name'], required: false },
          { model: ProgramFee, as: 'feeSchema', required: false },
          { model: Invoice, as: 'invoice', required: false },
          { model: Payment, as: 'payments', required: false }
        ],
        order: [['createdAt', 'DESC']]
      });
      res.json(students || []);
    } catch (error) {
      console.error("ERROR:", error);
      res.status(500).json({ message: error.message || "Internal Server Error" });
    }
});

// 2. Center/Department Approval Queue
router.get('/approvals/centers', verifyToken, isFinanceOrAdmin, async (req, res) => {
  try {
    const { status } = req.query; // pending | approved | rejected
    
    let auditStatus = 'PENDING_FINANCE';
    if (status === 'approved') auditStatus = 'approved';
    else if (status === 'rejected') auditStatus = 'rejected';

    const centers = await Department.findAll({
      where: {
        type: { [Op.in]: ['partner center', 'partner centers', 'partner-center', 'study-center'] },
        auditStatus
      },
      attributes: ['id', 'name', 'shortName', 'type', 'auditStatus', 'centerStatus', 'description', 'metadata', 'bdeId', 'createdAt', 'financeRemarks', 'rejectionReason'],
      include: [
        { model: User, as: 'referringBDE', attributes: ['name', 'uid'] }
      ]
    });
    res.json(centers || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch center verification queue' });
  }
});

// Final Center Ratification (Finance)
router.put('/centers/:id/verify-audit', verifyToken, isFinanceOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body; // status: 'approved' | 'rejected'

    if (!remarks || remarks.length < 12) {
        return res.status(400).json({ error: 'Forrestic audit remarks (min 12 chars) mandatory for center ratification' });
    }

    const center = await Department.findByPk(id);
    if (!center || !['partner center', 'partner centers', 'partner-center', 'study-center'].includes(center.type)) {
      return res.status(404).json({ error: 'Study center not located in registry' });
    }

    const financeRecipients = await User.findAll({
      where: {
        role: { [Op.in]: ['Finance Admin', 'Organization Admin'] },
        status: 'active'
      },
      attributes: ['uid']
    });

    if (status === 'approved') {
        const preferredId = (center.shortName || `CTR-${center.id}`).toUpperCase();
        let finalLoginId = preferredId;
        let finalPassword = null;
        let hashedPassword = null;

        // 1. Locate existing administrator provisioned during registration (Public Onboarding)
        let existingUser = await User.findOne({ 
            where: { 
                [Op.or]: [
                    { uid: center.adminId },
                    { deptId: center.id, role: 'Partner Center' }
                ]
            } 
        });

        if (existingUser) {
            console.log(`[FINANCE-RATIFICATION] Existing administrator found for center ${center.id}. Preserving registration credentials.`);
            finalPassword = existingUser.devPassword || 'PRE-HASHED-PROTECTED';
            hashedPassword = existingUser.password;
            
            // Institutional Branding: Synchronize UID with shortName if current UID is random
            if (existingUser.uid.startsWith('CTR-') && preferredId && existingUser.uid !== preferredId) {
                const idConflict = await User.count({ where: { uid: preferredId } });
                if (idConflict === 0) {
                    console.log(`[FINANCE-RATIFICATION] Synchronizing random UID ${existingUser.uid} to institutional ID: ${preferredId}`);
                    // Since UID is a primary key, we update it directly (safe for new registrations with minimal dependencies)
                    await existingUser.update({ uid: preferredId });
                    finalLoginId = preferredId;
                } else {
                    finalLoginId = existingUser.uid;
                }
            } else {
                finalLoginId = existingUser.uid;
            }
        } else {
            // Fallback: Legacy/Manual Provisioning logic
            console.log(`[FINANCE-RATIFICATION] No pre-registered user found. Initializing new institutional credentials.`);
            finalLoginId = preferredId;
            finalPassword = `CTR-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;
            hashedPassword = await bcrypt.hash(finalPassword, 10);
        }

        const centerEmail = center.metadata?.contactEmail || center.email || `${finalLoginId.toLowerCase()}@center.erp`;
        
        // Ensure the User record is fully synchronized and active
        const [user, created] = await User.findOrCreate({
            where: { uid: finalLoginId },
            defaults: {
                password: hashedPassword,
                devPassword: finalPassword,
                name: center.name,
                email: centerEmail,
                role: 'Partner Center',
                deptId: center.id,
                status: 'active'
            }
        });

        if (!created) {
            if (Number(user.deptId) !== Number(center.id)) {
                return res.status(400).json({ error: `System Conflict: Institutional UID "${finalLoginId}" already exists and is assigned to a different center.` });
            }
            // Sync status and metadata without overwriting password if it's already set
            await user.update({ 
                status: 'active',
                email: centerEmail,
                deptId: center.id
            });
        }

        await center.update({
            auditStatus: 'approved',
            status: 'active',
            adminId: user.uid,
            loginId: finalLoginId,
            password: finalPassword || ' [REGISTERED-PWD] ',
            financeRemarks: remarks
        });

        if (center.bdeId) {
            try {
                // Verify BDE exists before notifying to prevent FK constraint failure
                const bdeExists = await User.findByPk(center.bdeId);
                if (bdeExists) {
                    await Notification.create({
                        userUid: center.bdeId,
                        type: 'success',
                        message: `Institutional Ratification: Center "${center.name}" has been approved by Finance and is now ACTIVE.`,
                        link: '/dashboard/sales/referrals'
                    });
                }
            } catch (notifyError) {
                console.error('[RATIFICATION_NOTIFY_ERROR]:', notifyError);
                // Non-blocking: Audit can continue even if notification fails
            }
        }
    } else {
        await center.update({
            auditStatus: 'rejected',
            status: 'inactive',
            rejectionReason: remarks,
            financeRemarks: remarks
        });

        // Notify Stakeholders of rejection
        try {
            // 1. Notify Operations Team (Academic Operations)
            const opsAdmins = await User.findAll({
                where: { 
                    role: { 
                        [Op.in]: ['Operations Admin', 'Academic Operations Admin', 'Organization Admin'] 
                    } 
                }
            });

            for (const admin of opsAdmins) {
                await Notification.create({
                    userUid: admin.uid,
                    type: 'error',
                    message: `Institutional Audit Failure: Center "${center.name}" has been rejected by Finance. Ref: ${remarks}`,
                    link: '/dashboard/operations/center-audit?tab=rejected'
                });
            }

            // 2. Notify referring BDE (if exists)
            if (center.bdeId) {
                const bdeExists = await User.findByPk(center.bdeId);
                if (bdeExists) {
                    await Notification.create({
                        userUid: center.bdeId,
                        type: 'error',
                        message: `Institutional Ratification Failure: Center "${center.name}" has been rejected by Finance. Remarks: ${remarks}`,
                        link: '/dashboard/sales/referrals'
                    });
                }
            }
        } catch (notifyError) {
            console.error('[RATIFICATION_REJECTION_NOTIFY_ERROR]:', notifyError);
            // Non-blocking
        }
    }

    await logAction({
        userId: req.user.uid,
        action: `CENTER_${status.toUpperCase()}`,
        entity: 'Department',
        details: `Finance ${status} center audit for "${center.name}". Remarks: ${remarks}`,
        module: 'Finance'
    });

    await clearNotifications({
      userUids: financeRecipients.map((user) => user.uid),
      links: ['/dashboard/finance/center-verification?tab=pending'],
      messagePatterns: [
        `%${center.name}%requires finance ratification%`,
        `%New Center Pending Verification:%${center.name}%`
      ]
    });

    res.json({ 
        message: `Center ${status} and institutional boundaries established.`, 
        center: center.get({ plain: true }),
        credentials: status === 'approved' ? { 
            loginId: center.loginId || finalLoginId, 
            password: center.password || finalPassword 
        } : null
    });
  } catch (error) {
    console.error('[CENTER_AUDIT_FINANCE_ERROR]:', error);
    res.status(500).json({ 
        error: error.name === 'SequelizeUniqueConstraintError' 
            ? 'Conflict: Institutional credential or email already in use.' 
            : `Center ratification protocol failure: ${error.message || 'Unknown internal error'}` 
    });
  }
});

// 3. Request Approval Queue (Credential/Modification)
router.get('/approvals/requests', verifyToken, isFinanceOrAdmin, async (req, res) => {
  try {
    const requests = await ChangeRequest.findAll({
      where: { status: 'pending' },
      include: [
        { model: User, attributes: ['name', 'role'], required: false },
        { model: Department, as: 'center', attributes: ['name'], required: false }
      ]
    });
    res.json(requests || []);
  } catch (error) {
    console.error("ERROR:", error);
    res.status(500).json({ message: error.message || "Internal Server Error" });
  }
});

// 4. Processed Security Requests (Credential Audit)
router.get('/credentials/audit', verifyToken, isFinanceOrAdmin, async (req, res) => {
  try {
    const requests = await CredentialRequest.findAll({
      where: { status: { [Op.ne]: 'pending' } },
      include: [
        { model: Department, as: 'center', attributes: ['name', 'shortName'] },
        { model: User, as: 'requester', attributes: ['name', 'role'] }
      ],
      order: [['updatedAt', 'DESC']]
    });
    res.json(requests || []);
  } catch (error) {
    console.error("ERROR:", error);
    res.status(500).json({ message: error.message || "Internal Server Error" });
  }
});

router.post('/approvals/requests/:id/approve', verifyToken, isFinanceOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body; // status: approved/rejected

    if (!remarks || remarks.length < 12) {
      return res.status(400).json({ error: 'Mandatory audit remarks (min 12 chars) required' });
    }

    const request = await ChangeRequest.findByPk(id);
    if (!request) return res.status(404).json({ error: 'Target request node not located' });

    await request.update({ status, financeRemarks: remarks });

    // Custom logic based on request type (e.g., if type is 'credential', reveal temp access)
    // For now, standardizing the status update.

    await logAction({
      userId: req.user.uid,
      action: 'APPROVE_REQUEST',
      entity: 'ChangeRequest',
      details: `Request ${request.id} ${status} by Finance. Remarks: ${remarks}`,
      module: 'Finance',
      remarks,
      ipAddress: req.ip
    });

    res.json({ message: `Institutional request ${status} successfully`, request });
  } catch (error) {
    console.error("ERROR:", error);
    res.status(500).json({ message: error.message || "Internal Server Error" });
  }
});

// --- Finalize Enrollment Protocol ---

router.post('/approvals/students/:id/finalize', verifyToken, isFinanceOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;

    if (!remarks) return res.status(400).json({ error: 'Forensic audit remarks required for status elevation' });

    const student = await Student.findByPk(id, {
      include: [{ model: Invoice, as: 'activationInvoice' }]
    });

    if (!student) return res.status(404).json({ error: 'Target student node not located' });
    if (!['FINANCE_APPROVED', 'PAYMENT_VERIFIED', 'FINANCE_PENDING'].includes(student.status)) {
      return res.status(400).json({ error: 'Finalize protocol blocked: Student must have manual FINANCE_APPROVED, automated PAYMENT_VERIFIED, or validated FINANCE_PENDING clearance.' });
    }

    // GAP-15: Auto-settle activation invoice during manual finalization
    let linkedInvoice = student.activationInvoice;
    if (!linkedInvoice) {
        // Fallback for students with loose associations
        linkedInvoice = await Invoice.findOne({ where: { studentId: id }, order: [['createdAt', 'DESC']] });
    }

    if (linkedInvoice && linkedInvoice.status !== 'paid') {
        await linkedInvoice.update({ status: 'paid' });
    }

    if (!linkedInvoice || linkedInvoice.status !== 'paid') {
      return res.status(400).json({ error: 'Security alert: No valid paid invoice linked. Activation blocked.' });
    }

    const nextStatus = 'ENROLLED';
    const logs = student.verificationLogs || [];
    logs.push({ 
        step: 'Finance_Finalize', 
        time: new Date(), 
        status: 'ENROLLED', 
        by: req.user.uid, 
        ip: req.ip,
        remarks 
    });

    await student.update({
      status: nextStatus,
      enrollStatus: 'active',
      feeStatus: 'PAID',
      verificationLogs: logs
    });

    await logAction({
      userId: req.user.uid,
      action: 'FINALIZE_ENROLLMENT',
      entity: 'Student',
      details: `Student ${student.name} (#${student.id}) activated post-finance validation. IP: ${req.ip}`,
      module: 'Finance',
      remarks,
      ipAddress: req.ip
    });

    const financeRecipients = await User.findAll({
      where: {
        role: { [Op.in]: ['Finance Admin', 'Organization Admin'] },
        status: 'active'
      },
      attributes: ['uid']
    });

    await clearNotifications({
      userUids: financeRecipients.map((user) => user.uid),
      links: ['/dashboard/finance/approvals'],
      messagePatterns: [
        `Finance Review Required: ${student.name}:%`,
        `%${student.name}%finance verification%`
      ]
    });

    // --- Institutional Identity Provisioning (Student Portal Access) ---
    // Check if a User account already exists for this student identity node
    const studentUid = `STU${student.id}`;
    let user = await User.findByPk(studentUid);

    if (!user) {
        const bcrypt = (await import('bcryptjs')).default;
        const hashedPassword = await bcrypt.hash('Student@123', 10);
        
        user = await User.create({
            uid: studentUid,
            name: student.name,
            email: student.email || `STU${student.id}@institution.edu`,
            password: hashedPassword,
            role: 'student',
            deptId: student.deptId,
            subDepartment: student.subDepartmentId?.toString(),
            status: 'active'
        });
        
        console.log(`[AUTH] Institutional identity provisioned for Student: ${studentUid}`);
    }

    res.json({ message: 'Institutional activation protocol finalized. Student is now ACTIVE and portal access provisioned.', student, user });
  } catch (error) {
    console.error("ERROR:", error);
    res.status(500).json({ message: error.message || "Internal Server Error" });
  }
});

// --- Manual Finance Approval Gate ---

router.post('/approvals/students/:id/approve', verifyToken, isFinanceOrAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { remarks } = req.body;

        if (!remarks || remarks.length < 12) {
            return res.status(400).json({ error: 'Institutional Guardrail: Finance approval requires forensic remarks (min 12 chars).' });
        }

        const student = await Student.findByPk(id);
        if (!student) return res.status(404).json({ error: 'Student not found.' });

        if (!['PAYMENT_VERIFIED', 'FINANCE_PENDING'].includes(student.status)) {
            return res.status(400).json({ error: 'Protocol Violation: Student must be in FINANCE_PENDING or PAYMENT_VERIFIED state.' });
        }

        await student.update({
            status: 'FINANCE_APPROVED',
            enrollStatus: 'finance_approved',
            remarks: remarks
        });

        await logAction({
            userId: req.user.uid,
            action: 'FINANCE_APPROVE',
            entity: 'Student',
            details: `Finance manual clearance granted for ${student.name}`,
            module: 'Finance',
            remarks
        });

        const financeRecipients = await User.findAll({
            where: {
                role: { [Op.in]: ['Finance Admin', 'Organization Admin'] },
                status: 'active'
            },
            attributes: ['uid']
        });

        await clearNotifications({
            userUids: financeRecipients.map((user) => user.uid),
            links: ['/dashboard/finance/approvals'],
            messagePatterns: [
                `Finance Review Required: ${student.name}:%`,
                `%${student.name}%finance verification%`
            ]
        });

        res.json({ message: 'Finance clearance recorded. Student moved to FINANCE_APPROVED.', student });
    } catch (error) {
        res.status(500).json({ error: 'Finance approval protocol failed.' });
    }
});

router.post('/approvals/students/:id/reject', verifyToken, isFinanceOrAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { remarks } = req.body;

        if (!remarks || remarks.length < 12) {
            return res.status(400).json({ error: 'Institutional Guardrail: Rejection requires forensic remarks (min 12 chars).' });
        }

        const student = await Student.findByPk(id);
        if (!student) return res.status(404).json({ error: 'Student not found.' });

        await student.update({
            status: 'REJECTED',
            enrollStatus: 'rejected',
            remarks: remarks
        });

        await logAction({
            userId: req.user.uid,
            action: 'FINANCE_REJECT',
            entity: 'Student',
            details: `Finance rejection issued for ${student.name}`,
            module: 'Finance',
            remarks
        });

        const financeRecipients = await User.findAll({
            where: {
                role: { [Op.in]: ['Finance Admin', 'Organization Admin'] },
                status: 'active'
            },
            attributes: ['uid']
        });

        await clearNotifications({
            userUids: financeRecipients.map((user) => user.uid),
            links: ['/dashboard/finance/approvals'],
            messagePatterns: [
                `Finance Review Required: ${student.name}:%`,
                `%${student.name}%finance verification%`
            ]
        });

        res.json({ message: 'Student application rejected by Finance.', student });
    } catch (error) {
        res.status(500).json({ error: 'Finance rejection protocol failed.' });
    }
});

// --- Financial Aging Telemetry ---

router.get('/aging/student/:id', verifyToken, isFinanceOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const invoices = await Invoice.findAll({
        where: { studentId: id, status: 'issued' }
    });

    const now = new Date();
    const aging = {
        current: 0,
        days30: 0,
        days60: 0,
        days90Plus: 0,
        totalPending: 0
    };

    invoices.forEach(inv => {
        const diffDays = Math.floor((now.getTime() - new Date(inv.createdAt).getTime()) / (1000 * 3600 * 24));
        const amount = parseFloat(inv.total);
        aging.totalPending += amount;

        if (diffDays <= 30) aging.current += amount;
        else if (diffDays <= 60) aging.days30 += amount;
        else if (diffDays <= 90) aging.days60 += amount;
        else aging.days90Plus += amount;
    });

    res.json(aging);
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate financial aging' });
  }
});

router.get('/aging/center/:id', verifyToken, isFinanceOrAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      // Get all students for this center and their pending invoices
      const students = await Student.findAll({ where: { centerId: id }, attributes: ['id'] });
      const studentIds = students.map(s => s.id);

      const invoices = await Invoice.findAll({
          where: { studentId: studentIds, status: 'issued' }
      });

      const now = new Date();
      const aging = {
          current: 0,
          days30: 0,
          days60: 0,
          days90Plus: 0,
          totalPending: 0
      };

      invoices.forEach(inv => {
          const diffDays = Math.floor((now.getTime() - new Date(inv.createdAt).getTime()) / (1000 * 3600 * 24));
          const amount = parseFloat(inv.total);
          aging.totalPending += amount;

          if (diffDays <= 30) aging.current += amount;
          else if (diffDays <= 60) aging.days30 += amount;
          else if (diffDays <= 90) aging.days60 += amount;
          else aging.days90Plus += amount;
      });

      res.json(aging);
    } catch (error) {
      res.status(500).json({ error: 'Failed to calculate center receivables aging' });
    }
});

router.put('/admission-sessions/:id/approve', verifyToken, isFinanceOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;

    if (!remarks || remarks.length < 12) {
      return res.status(400).json({ error: 'Mandatory audit remarks (min 12 chars) required' });
    }

    const session = await AdmissionSession.findByPk(id);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    await session.update({ 
        financeStatus: status, 
        isActive: status === 'approved' 
    });

    await AuditLog.create({
      entity: 'AdmissionSession',
      action: 'APPROVE_SESSION',
      userId: req.user.uid,
      remarks,
      module: 'Finance'
    });

    res.json({ message: `Admission session ${status} successfully`, session });
  } catch (error) {
    res.status(500).json({ error: 'Session approval protocol failure' });
  }
});

router.put('/students/:id/verify-fee', verifyToken, isFinanceOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body; // status: 'approved' | 'rejected'

    const student = await Student.findByPk(id);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    if (student.enrollStatus !== 'pending_finance') {
      return res.status(400).json({ error: 'Student is not in finance verification phase' });
    }

    const logs = student.verificationLogs || [];
    logs.push({ step: 'Finance', time: new Date(), status, by: req.user.uid, remarks });

    await student.update({
      status: status === 'approved' ? 'ENROLLED' : 'REJECTED',
      enrollStatus: status === 'approved' ? 'active' : 'rejected_finance',
      verificationLogs: logs,
      feeStatus: status === 'approved' ? 'verified' : 'discrepancy',
      remarks: remarks || student.remarks
    });

    await logAction({
      userId: req.user.uid,
      action: 'UPDATE',
      entity: 'Student',
      details: `Finance fee verification ${status} for ${student.name}. New status: ${status === 'approved' ? 'ENROLLED' : 'REJECTED'}`,
      module: 'Finance'
    });

    res.json({ message: `Finance verification ${status} successfully`, student });
  } catch (error) {
    res.status(500).json({ error: 'Fee verification protocol failed' });
  }
});


// --- Accreditation Pipeline ---
router.get('/accreditation-requests', verifyToken, async (req, res) => {
  try {
    const { status } = req.query;
    const AccreditationRequest = sequelize.models.accreditation_request;
    const Department = sequelize.models.department;
    
    const requestsRaw = await AccreditationRequest.findAll({
      where: { status: status || 'finance_pending' },
      include: [
        { model: Department, as: 'center', attributes: ['name'] }
      ]
    });

    const requests = await Promise.all(requestsRaw.map(async (r) => {
      const u = r.assignedUniversityId ? await Department.findByPk(r.assignedUniversityId) : null;
      const s = r.assignedSubDeptId ? await Department.findByPk(r.assignedSubDeptId) : null;
      return { ...r.toJSON(), assignedUniversityName: u?.name, assignedSubDeptName: s?.name };
    }));
    
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch accreditation queue' });
  }
});

router.put('/accreditation-requests/:id/approve', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;
    
    const AccreditationRequest = sequelize.models.accreditation_request;
    const Department = sequelize.models.department;
    const Program = sequelize.models.program;
    const ProgramOffering = sequelize.models.program_offering;

    const request = await AccreditationRequest.findByPk(id);
    if (!request) return res.status(404).json({ error: 'Request not found' });

    // Step 1: Approve Request
    await request.update({ status: 'approved', remarks });

    // Step 2: Auto-Generate Official Program
    const subDept = await Department.findByPk(request.assignedSubDeptId);
    
    const newProgram = await Program.create({
      name: request.courseName,
      status: 'active',
      universityId: request.assignedUniversityId,
      subDeptId: request.assignedSubDeptId,
      type: subDept ? subDept.name : 'Internal',
      duration: 12,
      maxLeaves: 0
    });

    await request.update({ linkedProgramId: newProgram.id });

    // Step 3: Link Program to specific center
    await ProgramOffering.create({
      centerId: request.centerId,
      programId: newProgram.id,
      status: 'open',
      accreditationRequestId: request.id
    });

    res.json({ message: 'Program formally finalized and injected into execution architecture' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Finalization protocol failed' });
  }
});

export default router;
