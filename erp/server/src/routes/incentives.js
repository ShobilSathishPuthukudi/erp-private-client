import express from 'express';
import { models } from '../models/index.js';
const router = express.Router();
const { IncentivePayout, User, IncentiveRule, Target } = models;

// Calculate & Submit Payout (Finance/System)
router.post('/submit-payout', async (req, res) => {
  try {
    const { userId, ruleId, amount, achievementPercentage, period } = req.body;
    const payout = await IncentivePayout.create({
      userId,
      ruleId,
      amount,
      achievementPercentage,
      period,
      status: 'pending_ceo'
    });
    res.status(201).json(payout);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// CEO Approval Flow
router.put('/ceo/approve/:id', async (req, res) => {
  try {
    if (req.user.role !== 'ceo') return res.status(403).json({ error: 'CEO Authorization Required' });
    
    const { status, remarks } = req.body; // status: approved or rejected
    const payout = await IncentivePayout.findByPk(req.params.id);
    if (!payout) return res.status(404).json({ error: 'Payout not found' });

    payout.status = status;
    payout.ceoRemarks = remarks;
    await payout.save();

    res.json(payout);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get HR Payroll Queue
router.get('/hr/payouts', async (req, res) => {
  try {
    const payouts = await IncentivePayout.findAll({
      where: { status: 'approved' },
      include: [{ model: User, as: 'employee', attributes: ['name', 'uid'] }]
    });
    res.json(payouts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
