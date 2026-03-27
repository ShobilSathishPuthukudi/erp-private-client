import express from 'express';
import { models } from '../models/index.js';
import { verifyToken } from '../middleware/verifyToken.js';
import validate from '../middleware/validate.js';
import { paymentSchema } from '../lib/schemas.js';
import { logAction } from '../lib/audit.js';
import { requireMandatoryRemarks } from '../middleware/auditMiddleware.js';
import erpEvents from '../lib/events.js';

const router = express.Router();
const { Payment, Invoice, Student, AuditLog, ChangeRequest, AdmissionSession, Department, Program } = models;

const isFinanceOrAdmin = (req, res, next) => {
  const allowed = ['finance', 'org-admin', 'system-admin'];
  if (!allowed.includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied: Finance privileges required' });
  }
  next();
};

// Enforce mandatory remarks for all EDIT/DELETE actions in this module
router.use(['/payments/:id', '/invoices/:id', '/students/:id/verify-fee'], requireMandatoryRemarks);

router.get('/payments', verifyToken, isFinanceOrAdmin, async (req, res) => {
  try {
    const payments = await Payment.findAll({
      include: [{ model: Student, as: 'student', attributes: ['name', 'enrollStatus'] }],
      order: [['date', 'DESC']]
    });
    res.json(payments);
  } catch (error) {
    console.error('Fetch payments error:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

router.post('/payments', verifyToken, isFinanceOrAdmin, validate(paymentSchema), async (req, res) => {
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

router.post('/payments/:id/verify', verifyToken, isFinanceOrAdmin, async (req, res) => {
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

    // GAP-1: Automatically Generate Issue Record
    const gstRate = 0.18; // Fixed 18% tax simulation
    const amountVal = parseFloat(payment.amount);
    const gstVal = amountVal * gstRate;
    const totalVal = amountVal + gstVal;
    
    const invoiceNo = `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;

    // KPI Attribution: Find student and center's BDE
    const studentForKpi = await Student.findByPk(payment.studentId, {
        include: [{ model: Department, as: 'center' }]
    });

    const invoice = await Invoice.create({
      paymentId: payment.id,
      studentId: payment.studentId,
      invoiceNo,
      amount: amountVal,
      gst: gstVal,
      total: totalVal,
      status: 'issued',
      centerId: studentForKpi?.centerId,
      salesUserId: studentForKpi?.center?.bdeId
    });

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

    // Transition student status to PAYMENT_VERIFIED if they were FINANCE_PENDING
    const student = await Student.findByPk(payment.studentId);
    if (student && student.status === 'FINANCE_PENDING') {
        await student.update({ status: 'PAYMENT_VERIFIED' });
        
        // Emit Institutional Event
        erpEvents.emit('PAYMENT_VERIFIED', { 
            studentId: student.id, 
            paymentId: payment.id, 
            invoiceNo: invoice.invoiceNo 
        });
    }

    res.json({ message: 'Payment successfully verified and auto-invoiced. Student readiness: PAYMENT_VERIFIED.', payment, invoice });
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ error: 'Failed to verify payment and process invoice' });
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
    const invoices = await Invoice.findAll({
      include: [{ model: Student, attributes: ['name'] }],
      order: [['createdAt', 'DESC']]
    });
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

router.get('/change-requests', verifyToken, isFinanceOrAdmin, async (req, res) => {
  try {
    const requests = await ChangeRequest.findAll({
      where: { status: 'pending_finance' },
      include: [{ model: User, attributes: ['name', 'role'] }]
    });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch finance change requests' });
  }
});

router.get('/admission-sessions', verifyToken, isFinanceOrAdmin, async (req, res) => {
  try {
    const sessions = await AdmissionSession.findAll({
       where: { financeStatus: 'pending' }
    });
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pending sessions' });
  }
});

// --- Institutional Approval Queues ---

// 1. Student Approval Queue (PAYMENT_VERIFIED Filter)
router.get('/approvals/students', verifyToken, isFinanceOrAdmin, async (req, res) => {
  try {
    const students = await Student.findAll({
      where: { status: 'PAYMENT_VERIFIED' },
      include: [
        { model: Department, as: 'center', attributes: ['name'] },
        { model: Program, attributes: ['name'] },
        { model: Invoice, as: 'invoice', where: { status: 'paid' } } 
      ],
      order: [['updatedAt', 'ASC']]
    });
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch student approval queue' });
  }
});

// 2. Center/Department Approval Queue
router.get('/approvals/centers', verifyToken, isFinanceOrAdmin, async (req, res) => {
  try {
    const centers = await Department.findAll({
      where: { type: 'study-center', status: 'pending_finance' }
    });
    res.json(centers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch center approval queue' });
  }
});

// 3. Request Approval Queue (Credential/Modification)
router.get('/approvals/requests', verifyToken, isFinanceOrAdmin, async (req, res) => {
  try {
    const requests = await ChangeRequest.findAll({
      where: { status: 'pending' },
      include: [
        { model: User, attributes: ['name', 'role'] },
        { model: Department, as: 'center', attributes: ['name'] }
      ]
    });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch request approval queue' });
  }
});

router.post('/approvals/requests/:id/approve', verifyToken, isFinanceOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body; // status: approved/rejected

    if (!remarks || remarks.length < 50) {
      return res.status(400).json({ error: 'Mandatory audit remarks (min 50 chars) required' });
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
    res.status(500).json({ error: 'Request approval protocol failure' });
  }
});

// --- Finalize Enrollment Protocol ---

router.post('/approvals/students/:id/finalize', verifyToken, isFinanceOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;

    if (!remarks) return res.status(400).json({ error: 'Forensic audit remarks required for status elevation' });

    const student = await Student.findByPk(id, {
      include: [{ model: Invoice, as: 'invoice' }]
    });

    if (!student) return res.status(404).json({ error: 'Target student node not located' });
    if (student.status !== 'FINANCE_APPROVED') {
      return res.status(400).json({ error: 'Finalize protocol blocked: Student must have manual FINANCE_APPROVED clearance.' });
    }

    // Strict Payment Check
    const linkedInvoice = student.invoice;
    if (!linkedInvoice || linkedInvoice.status !== 'paid') {
      return res.status(400).json({ error: 'Security alert: Unpaid invoice linked. Activation blocked.' });
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

    res.json({ message: 'Institutional enrollment finalized. Student is now ACTIVE.', student });
  } catch (error) {
    console.error('Finalize enrollment error:', error);
    res.status(500).json({ error: 'Institutional activation protocol failed' });
  }
});

// --- Manual Finance Approval Gate ---

router.post('/approvals/students/:id/approve', verifyToken, isFinanceOrAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { remarks } = req.body;

        if (!remarks || remarks.length < 50) {
            return res.status(400).json({ error: 'Institutional Guardrail: Finance approval requires forensic remarks (min 50 chars).' });
        }

        const student = await Student.findByPk(id);
        if (!student) return res.status(404).json({ error: 'Student not found.' });

        if (student.status !== 'PAYMENT_VERIFIED') {
            return res.status(400).json({ error: 'Protocol Violation: Student must be in PAYMENT_VERIFIED state.' });
        }

        await student.update({
            status: 'FINANCE_APPROVED',
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

        res.json({ message: 'Finance clearance recorded. Student moved to FINANCE_APPROVED.', student });
    } catch (error) {
        res.status(500).json({ error: 'Finance approval protocol failed.' });
    }
});

router.post('/approvals/students/:id/reject', verifyToken, isFinanceOrAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { remarks } = req.body;

        if (!remarks || remarks.length < 50) {
            return res.status(400).json({ error: 'Institutional Guardrail: Rejection requires forensic remarks (min 50 chars).' });
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

    if (!remarks || remarks.length < 50) {
      return res.status(400).json({ error: 'Mandatory audit remarks (min 50 chars) required' });
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

export default router;
router.put('/students/:id/verify-fee', verifyToken, isFinanceOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body; // status: 'approved' | 'rejected'

    const student = await Student.findByPk(id);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    if (student.enrollStatus !== 'pending_finance') {
      return res.status(400).json({ error: 'Student is not in finance verification phase' });
    }

    const nextStatus = status === 'approved' ? 'active' : 'rejected_finance';
    
    const logs = student.verificationLogs || [];
    logs.push({ step: 'Finance', time: new Date(), status, by: req.user.uid, remarks });

    await student.update({
      enrollStatus: nextStatus,
      verificationLogs: logs,
      feeStatus: status === 'approved' ? 'verified' : 'discrepancy',
      remarks: remarks || student.remarks
    });

    // If approved, trigger final admission tasks (UID generation, etc. - in a real system)
    
    await logAction({
      userId: req.user.uid,
      action: 'UPDATE',
      entity: 'Student',
      details: `Finance fee verification ${status} for ${student.name}. Next status: ${nextStatus}`,
      module: 'Finance'
    });

    res.json({ message: `Finance verification ${status} successfully`, student });
  } catch (error) {
    res.status(500).json({ error: 'Fee verification protocol failed' });
  }
});
