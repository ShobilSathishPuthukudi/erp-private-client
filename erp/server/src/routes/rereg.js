import express from 'express';
import { models } from '../models/index.js';
import { verifyToken } from '../middleware/verifyToken.js';
import { logAction } from '../lib/audit.js';

const router = express.Router();
const { Student, AdmissionSession, ReregRequest, ReregConfig, Program, Department } = models;

const isFinanceOrAdmin = (req, res, next) => {
  const allowed = ['finance', 'org-admin', 'system-admin'];
  if (!allowed.includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied: Finance clearance required for REREG' });
  }
  next();
};

// GET REREG Queue (Finance View - Pending Requests)
router.get('/queue', verifyToken, isFinanceOrAdmin, async (req, res) => {
    try {
        console.log("[REREG] Fetching pending reregistration requests...");
        const requests = await ReregRequest.findAll({
            where: { status: 'pending' },
            include: [
                { 
                  model: Student, 
                  attributes: ['name', 'uid', 'pendingAmount'],
                  include: [{ model: Program, attributes: ['name'], required: false }]
                }
            ],
            order: [['createdAt', 'DESC']]
        });
        res.json(requests || []);
    } catch (error) {
        console.error("REREG_QUEUE_ERROR:", error);
        res.status(500).json({ message: error.message });
    }
});

// POST Verify REREG Request
router.post('/verify/:id', verifyToken, isFinanceOrAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, remarks } = req.body;

        const request = await ReregRequest.findByPk(id, {
            include: [{ model: Student }]
        });
        
        if (!request) return res.status(404).json({ error: 'REREG request not found' });

        // PRD Rule: No dues allowed for verification
        if (status === 'verified' && parseFloat(request.student.pendingAmount || 0) > 0) {
            return res.status(400).json({ error: 'Compliance Violation: Student has outstanding dues.' });
        }

        await request.update({ 
            status: status === 'verified' ? 'verified' : 'rejected',
            verifiedBy: req.user.uid,
            remarks
        });

        await logAction({
            userId: req.user.uid,
            action: `REREG_${status.toUpperCase()}`,
            entity: 'ReregRequest',
            details: `REREG ${status} for student ${request.student.name}`,
            module: 'Finance',
            remarks
        });

        res.json({ message: `REREG ${status} successful`, request });
    } catch (error) {
        console.error("REREG_VERIFY_ERROR:", error);
        res.status(500).json({ error: 'REREG verification failed' });
    }
});

// GET REREG Configs
router.get('/config/all', verifyToken, async (req, res) => {
    try {
        const configs = await ReregConfig.findAll({
            include: [{ model: Program, attributes: ['name'] }]
        });
        res.json(configs || []);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch REREG configurations' });
    }
});

// POST Submit REREG Request (Student/Center View)
router.post('/submit', verifyToken, async (req, res) => {
    try {
        const { studentId, targetSemester, amountPaid, paymentProof, cycle } = req.body;
        
        // Ensure student exists
        const student = await Student.findOne({ where: { uid: studentId } });
        if (!student) return res.status(404).json({ error: 'Student not found' });

        const request = await ReregRequest.create({
            studentId: student.id,
            targetSemester,
            amountPaid,
            paymentProof,
            cycle,
            status: 'pending'
        });

        await logAction({
            userId: req.user.uid,
            action: 'REREG_SUBMIT',
            entity: 'ReregRequest',
            details: `REREG request submitted for student ${student.name} (Sem ${targetSemester})`,
            module: 'Academic'
        });

        res.status(201).json({ message: 'REREG request submitted successfully', request });
    } catch (error) {
        console.error("REREG_SUBMIT_ERROR:", error);
        res.status(500).json({ error: 'Failed to submit REREG request' });
    }
});

// Transition Student (Carryforward)
// ... remaining carryforward logic ...
router.post('/carryforward/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const student = await Student.findByPk(id);

        if (!student) return res.status(404).json({ error: 'Student not found' });

        // Check for latest approved request
        const lastRequest = await ReregRequest.findOne({
            where: { studentId: id, status: 'approved' },
            order: [['createdAt', 'DESC']]
        });

        if (!lastRequest) {
            return res.status(400).json({ error: 'Guardrail: Approved REREG request required.' });
        }

        const oldSession = student.sessionId;
        await student.update({
            sessionId: lastRequest.nextSessionId,
            currentSemester: (student.currentSemester || 1) + 1,
            reregStatus: 'carried_forward'
        });

        await logAction({
            userId: req.user.uid,
            action: 'REREG_CARRYFORWARD',
            entity: 'Student',
            details: `Moved student ${student.name} to next cycle.`,
            module: 'Academic'
        });

        res.json({ message: 'Cycle transition complete', student });
    } catch (error) {
        res.status(500).json({ error: 'Transition failed' });
    }
});

export default router;
