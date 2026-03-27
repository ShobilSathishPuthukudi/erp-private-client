import express from 'express';
import { models } from '../models/index.js';
import { verifyToken } from '../middleware/verifyToken.js';
import { logAction } from '../lib/audit.js';

const router = express.Router();
const { Student, AdmissionSession, Payment, Invoice } = models;

const isFinanceOrAdmin = (req, res, next) => {
  const allowed = ['finance', 'org-admin', 'system-admin'];
  if (!allowed.includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied: Finance clearance required for REREG' });
  }
  next();
};

// GET Eligible Students for REREG
router.get('/eligible', verifyToken, isFinanceOrAdmin, async (req, res) => {
    try {
        const students = await Student.findAll({
            where: { 
                status: 'ENROLLED',
                enrollStatus: 'active'
            }
        });
        res.json(students);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch REREG candidates' });
    }
});

// APPROVE REREG (Finance Gate)
router.post('/approve/:id', verifyToken, isFinanceOrAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { nextSessionId, remarks } = req.body;

        const student = await Student.findByPk(id);
        if (!student) return res.status(404).json({ error: 'Student not found.' });

        // PRD Rule: Finance must verify dues before REREG
        if (parseFloat(student.pendingAmount) > 0) {
            return res.status(400).json({ error: 'Compliance Violation: Student has outstanding dues. REREG blocked.' });
        }

        await student.update({
            reregStatus: 'approved',
            nextSessionId: nextSessionId,
            remarks: `REREG Approved: ${remarks}`
        });

        await logAction({
            userId: req.user.uid,
            action: 'REREG_APPROVE',
            entity: 'Student',
            details: `REREG approved for ${student.name} to session #${nextSessionId}`,
            module: 'Finance'
        });

        res.json({ message: 'REREG cleared by Finance.', student });
    } catch (error) {
        res.status(500).json({ error: 'REREG approval failed.' });
    }
});

// CARRY OVER (Complete Cycle)
router.post('/carryforward/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const student = await Student.findByPk(id);

        if (student.reregStatus !== 'approved') {
            return res.status(400).json({ error: 'Guardrail: Finance clearance required before carryforward.' });
        }

        const oldSession = student.sessionId;
        await student.update({
            sessionId: student.nextSessionId,
            currentSemester: student.currentSemester + 1,
            reregStatus: 'carried_forward',
            nextSessionId: null
        });

        await logAction({
            userId: req.user.uid,
            action: 'REREG_CARRYFORWARD',
            entity: 'Student',
            details: `Student ${student.name} moved from session #${oldSession} to #${student.sessionId}. Semester: ${student.currentSemester}`,
            module: 'Academic'
        });

        res.json({ message: 'Student successfully transitioned to next academic cycle.', student });
    } catch (error) {
        res.status(500).json({ error: 'Carryforward protocol failed.' });
    }
});

export default router;
