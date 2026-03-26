import express from 'express';
import { models } from '../models/index.js';
import { verifyToken } from '../middleware/verifyToken.js';
import validate from '../middleware/validate.js';
import { paymentSchema } from '../lib/schemas.js';
import { logAction } from '../lib/audit.js';
import { requireMandatoryRemarks } from '../middleware/auditMiddleware.js';

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
      include: [{ model: Student, attributes: ['name', 'enrollStatus'] }],
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

    const invoice = await Invoice.create({
      paymentId: payment.id,
      studentId: payment.studentId,
      invoiceNo,
      amount: amountVal,
      gst: gstVal,
      total: totalVal,
      status: 'issued'
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

    res.json({ message: 'Payment successfully verified and auto-invoiced.', payment, invoice });
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ error: 'Failed to verify payment and process invoice' });
  }
});

router.get('/invoices', verifyToken, isFinanceOrAdmin, async (req, res) => {
  try {
    const invoices = await Invoice.findAll({
      include: [{ model: Student, attributes: ['name', 'feeStatus'] }],
      order: [['createdAt', 'DESC']]
    });
    res.json(invoices);
  } catch (error) {
    console.error('Fetch invoices error:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// --- Affiliation Change Approval ---

router.get('/change-requests', verifyToken, isFinanceOrAdmin, async (req, res) => {
  try {
    const requests = await ChangeRequest.findAll({
      include: [
        { model: Department, as: 'center', attributes: ['name'] },
        { model: Program, as: 'currentProgram', foreignKey: 'currentProgramId', attributes: ['name'] }, // Need to ensure these associations exist in models/index.js if I use aliases
        { model: Program, as: 'requestedProgram', foreignKey: 'requestedProgramId', attributes: ['name'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch affiliation change requests' });
  }
});

router.put('/change-requests/:id/approve', verifyToken, isFinanceOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body; // status: approved/rejected

    if (!remarks || remarks.length < 50) {
      return res.status(400).json({ error: 'Mandatory remarks (min 50 chars) required for institutional audit' });
    }

    const request = await ChangeRequest.findByPk(id);
    if (!request) return res.status(404).json({ error: 'Request not found' });

    await request.update({ status, financeRemarks: remarks });

    if (status === 'approved') {
        // Logic to update all students of this center linked to the old program to the new program
        await Student.update(
            { programId: request.requestedProgramId, universityId: request.requestedUniversityId },
            { where: { centerId: request.centerId, programId: request.currentProgramId } }
        );
    }

    await logAction({
      userId: req.user.uid,
      action: 'CHANGE_AFFILIATION',
      entity: 'Center/Student',
      details: `${status} affiliation change for Center ${request.centerId}. Remarks: ${remarks}`,
      module: 'Finance',
      remarks
    });

    res.json({ message: `Affiliation change ${status} successfully`, request });
  } catch (error) {
    res.status(500).json({ error: 'Affiliation change protocol failure' });
  }
});

// --- Admission Session Approval ---

router.get('/admission-sessions', verifyToken, isFinanceOrAdmin, async (req, res) => {
  try {
    const sessions = await AdmissionSession.findAll({
      include: [
        { model: Program, attributes: ['name'] },
        { model: Department, as: 'subDept', attributes: ['name'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pending admission sessions' });
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
