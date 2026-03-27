import express from 'express';
import { models, sequelize } from '../models/index.js';
import { verifyToken } from '../middleware/verifyToken.js';
import { logAction } from '../lib/audit.js';
import { Op } from 'sequelize';

const router = express.Router();
const { Target, IncentiveRule, IncentivePayout, Invoice, User, Student } = models;

const isFinanceOrAdmin = (req, res, next) => {
  const allowed = ['finance', 'org-admin', 'system-admin'];
  if (!allowed.includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied: Finance clearance required' });
  }
  next();
};

// CALCULATE INCENTIVES (Performance Engine)
router.post('/calculate', verifyToken, isFinanceOrAdmin, async (req, res) => {
    try {
        const activeTargets = await Target.findAll({
            where: { status: 'active' },
            include: [{ model: IncentiveRule, as: 'rules' }]
        });

        const payouts = [];

        for (const target of activeTargets) {
            let achievement = 0;

            if (target.metric === 'revenue') {
                // Calculate revenue from paid invoices within period
                const revenueData = await Invoice.sum('total', {
                    where: {
                        status: 'paid',
                        createdAt: { [Op.between]: [target.startDate, target.endDate] }
                        // Filter by targetableId if type is user/dept - (simplified for now)
                    }
                });
                achievement = revenueData || 0;
            } else if (target.metric === 'enrollment') {
                achievement = await Student.count({
                    where: {
                        status: 'ENROLLED',
                        createdAt: { [Op.between]: [target.startDate, target.endDate] }
                    }
                });
            }

            // Apply Rules
            for (const rule of target.rules || []) {
                const structures = rule.structure; // Array of { achievement, reward }
                // Sort by achievement DESC to find highest tier met
                const sorted = structures.sort((a, b) => b.achievement - a.achievement);
                const tier = sorted.find(s => achievement >= s.achievement);

                if (tier) {
                    payouts.push({
                        userId: target.targetableId, // Assuming user target for now
                        targetId: target.id,
                        ruleId: rule.id,
                        amount: tier.reward,
                        status: 'pending',
                        remarks: `Achievement: ${achievement} met tier ${tier.achievement}`
                    });
                }
            }
        }

        if (payouts.length > 0) {
            await IncentivePayout.bulkCreate(payouts);
        }

        await logAction({
            userId: req.user.uid,
            action: 'CALCULATE_INCENTIVES',
            entity: 'IncentivePayout',
            details: `Calculated ${payouts.length} incentive payouts across active targets.`,
            module: 'Finance'
        });

        res.json({ message: 'Incentive calculation engine cycle completed.', payouts });
    } catch (error) {
        console.error('Incentive calculation error:', error);
        res.status(500).json({ error: 'Performance engine failure' });
    }
});

export default router;
