import express from 'express';
import { models } from '../models/index.js';
import { verifyToken } from '../middleware/verifyToken.js';
import { logAction } from '../lib/audit.js';

const router = express.Router();
const { EMI, Student, Invoice } = models;

const isFinanceOrAdmin = (req, res, next) => {
  const allowed = ['Finance Admin', 'Organization Admin', 'Organization Admin'];
  if (!allowed.includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied: Finance clearance required' });
  }
  next();
};

// GET EMI Plan for Student
router.get('/student/:studentId', verifyToken, async (req, res) => {
  try {
    const { studentId } = req.params;
    const emis = await EMI.findAll({
      where: { studentId },
      order: [['installmentNo', 'ASC']]
    });
    res.json(emis);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch EMI plan' });
  }
});

// CREATE EMI Plan (Internal/Finance)
router.post('/generate', verifyToken, isFinanceOrAdmin, async (req, res) => {
    try {
        const { studentId, invoiceId, count, totalAmount, startDate } = req.body;
        
        const amountPerInstallment = (parseFloat(totalAmount) / count).toFixed(2);
        const emis = [];
        let currentDate = new Date(startDate);

        for (let i = 1; i <= count; i++) {
            emis.push({
                studentId,
                invoiceId,
                installmentNo: i,
                amount: amountPerInstallment,
                dueDate: new Date(currentDate),
                status: 'pending'
            });
            currentDate.setMonth(currentDate.getMonth() + 1);
        }

        await EMI.bulkCreate(emis);
        
        await logAction({
            userId: req.user.uid,
            action: 'CREATE_EMI_PLAN',
            entity: 'EMI',
            details: `Generated ${count} installments for student #${studentId}`,
            module: 'Finance'
        });

        res.status(201).json({ message: 'EMI plan generated successfully', installments: emis });
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate EMI plan' });
    }
});

// RECORD EMI PAYMENT
router.post('/:id/pay', verifyToken, isFinanceOrAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const emi = await EMI.findByPk(id);
        if (!emi) return res.status(404).json({ error: 'EMI record not found' });

        await emi.update({
            status: 'paid',
            paidAt: new Date()
        });

        // Sync Student Financial Telemetry
        const student = await Student.findByPk(emi.studentId);
        if (student) {
            const amountVal = parseFloat(emi.amount);
            const currentPaid = parseFloat(student.paidAmount || 0);
            const currentPending = parseFloat(student.pendingAmount || 0);
            
            await student.update({
                paidAmount: currentPaid + amountVal,
                pendingAmount: Math.max(0, currentPending - amountVal)
            });
        }

        await logAction({
            userId: req.user.uid,
            action: 'PAY_EMI',
            entity: 'EMI',
            details: `EMI Installment #${emi.installmentNo} marked as PAID for student #${emi.studentId}`,
            module: 'Finance'
        });

        res.json({ message: 'EMI payment recorded successfully', emi });
    } catch (error) {
        res.status(500).json({ error: 'Failed to record EMI payment' });
    }
});

export default router;
