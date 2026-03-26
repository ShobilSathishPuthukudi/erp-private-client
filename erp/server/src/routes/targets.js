import express from 'express';
import { models } from '../models/index.js';
const router = express.Router();
const { Target, IncentiveRule, User, Department, Student, Invoice } = models;

// Create Target + Rule (Finance Only)
router.post('/finance/targets', async (req, res) => {
  try {
    const { targetableType, targetableId, metric, value, startDate, endDate, rules } = req.body;
    
    const target = await Target.create({
      targetableType,
      targetableId,
      metric,
      value,
      startDate,
      endDate,
      assignedBy: req.user.uid
    });

    if (rules && rules.length > 0) {
      await IncentiveRule.create({
        targetId: target.id,
        structure: rules,
        type: 'flat'
      });
    }

    res.status(201).json(target);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get Achievement (Shared)
router.get('/achievement/:targetId', async (req, res) => {
  try {
    const target = await Target.findByPk(req.params.targetId, {
      include: [{ model: IncentiveRule, as: 'rules' }]
    });
    if (!target) return res.status(404).json({ error: 'Target not found' });

    let current = 0;
    if (target.metric === 'enrollment') {
      // Count students enrolled in period
      current = await Student.count({
        where: {
          createdAt: { [models.Sequelize.Op.between]: [target.startDate, target.endDate] }
          // Add filters for BDE or Center if applicable
        }
      });
    } else if (target.metric === 'revenue') {
      const invoices = await Invoice.findAll({
        where: {
          createdAt: { [models.Sequelize.Op.between]: [target.startDate, target.endDate] },
          status: 'paid'
        }
      });
      current = invoices.reduce((sum, inv) => sum + parseFloat(inv.totalAmount), 0);
    }

    const percentage = (current / target.value) * 100;
    res.json({ target, current, percentage });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// My Targets (Sales/Study Center)
router.get('/my-targets', async (req, res) => {
  try {
    const targets = await Target.findAll({
      where: {
        targetableId: req.user.uid,
        status: 'active'
      },
      include: [{ model: IncentiveRule, as: 'rules' }]
    });
    res.json(targets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
