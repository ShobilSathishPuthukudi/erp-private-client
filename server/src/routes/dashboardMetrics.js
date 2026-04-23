import express from 'express';
import { models, sequelize } from '../models/index.js';
import { Op } from 'sequelize';
import { verifyToken, roleGuard } from '../middleware/verifyToken.js';

const router = express.Router();
const { Task, Student, Payment, User, Department, Target, Program, AdmissionSession } = models;

// Middleware for management-level access
const isManagementOrAdmin = roleGuard(['Organization Admin', 'Organization Admin', 'ceo', 'Academic Admin']);
const isFinanceLeadership = roleGuard(['Organization Admin', 'ceo', 'Finance Admin', 'Finance', 'Academic Operations Admin']);

// Threshold definitions (configurable)
const THRESHOLDS = {
  completionRate: { red: 60, amber: 85, green: 100 },
  turnaroundHours: { red: 72, amber: 48, green: 24 },
  revenuePerCenter: { red: 50000, amber: 150000, green: 500000 }
};

// Dept Admin/Management Metrics
router.get('/metrics/:deptId', verifyToken, async (req, res) => {
  try {
    const { deptId } = req.params;
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 1. Task Completion Rate
    const tasks = await Task.findAll({
      where: { 
        createdAt: { [Op.gt]: thirtyDaysAgo }
      }
    });

    const completed = tasks.filter(t => t.status === 'completed').length;
    const completionRate = tasks.length > 0 ? (completed / tasks.length) * 100 : 0;

    // 2. Revenue (Verified Payments)
    const revenue = await Payment.findAll({
      where: { 
        status: 'verified',
        createdAt: { [Op.gt]: thirtyDaysAgo }
      },
      include: [{ model: Student, as: 'student', include: [{ model: Department, as: 'center' }] }]
    });

    const metrics = [
      { 
        id: 'completion-rate',
        label: 'Task Completion Rate', 
        value: `${completionRate.toFixed(1)}%`,
        trend: [65, 78, 82, 75, 88, 92, 90], // Demo trend data
        status: completionRate < THRESHOLDS.completionRate.red ? 'red' : (completionRate < THRESHOLDS.completionRate.amber ? 'amber' : 'green')
      },
      {
        id: 'total-revenue',
        label: '30D Revenue',
        value: `₹${revenue.reduce((acc, p) => acc + parseFloat(p.amount), 0).toLocaleString()}`,
        trend: [45000, 52000, 48000, 61000, 55000, 67000, 72000],
        status: 'green'
      }
    ];

    res.json(metrics);
  } catch (error) {
    console.error("[DASHBOARD_ERROR] GET /metrics failure:", error);
    res.status(500).json({ error: 'Failed to fetch dashboard metrics', message: error.message });
  }
});

router.get('/reports/daily-admissions', verifyToken, isFinanceLeadership, async (req, res) => {
    try {
        console.log("[DASHBOARD] Fetching daily admissions report...");
        const today = new Date();
        const todayStart = new Date(today);
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(today);
        todayEnd.setHours(23, 59, 59, 999);

        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

        // Finance-facing "admissions" should reflect real progressed admissions,
        // not raw draft records created today.
        const admissionStatuses = ['PAYMENT_VERIFIED', 'FINANCE_APPROVED', 'ENROLLED'];

        // 1. Fetch today's real admission records
        const students = await Student.findAll({
            where: {
                status: { [Op.in]: admissionStatuses },
                [Op.or]: [
                    { createdAt: { [Op.between]: [todayStart, todayEnd] } },
                    { reviewedAt: { [Op.between]: [todayStart, todayEnd] } }
                ]
            },
            include: [
                { model: Department, as: 'center', attributes: ['name'], required: false },
                { model: Department, as: 'subDepartment', attributes: ['name'], required: false },
                { model: Program, attributes: ['name'], required: false },
                { model: AdmissionSession, attributes: ['id', 'name', 'startDate', 'endDate'], required: false }
            ],
            order: [[sequelize.literal('COALESCE(`student`.`reviewedAt`, `student`.`createdAt`)'), 'DESC']]
        });

        // 2. Calculate Daily Revenue (Verified)
        const dailyPayments = await Payment.findAll({
            where: {
                status: 'verified',
                createdAt: { [Op.gte]: todayStart }
            }
        });
        const dailyRevenue = dailyPayments.reduce((acc, p) => acc + parseFloat(p.amount || 0), 0);

        // 3. Calculate Monthly Revenue (Verified)
        const monthlyPayments = await Payment.findAll({
            where: {
                status: 'verified',
                createdAt: { [Op.gte]: monthStart }
            }
        });
        const monthlyTotal = monthlyPayments.reduce((acc, p) => acc + parseFloat(p.amount || 0), 0);

        // 4. Fetch Monthly Target (Global Revenue)
        const targetRecord = await Target.findOne({
            where: {
                metric: 'revenue',
                status: 'active'
            },
            order: [['createdAt', 'DESC']]
        });

        const activeSessions = await AdmissionSession.findAll({
            where: {
                startDate: { [Op.lte]: todayEnd },
                endDate: { [Op.gte]: todayStart }
            },
            attributes: ['id', 'name', 'startDate', 'endDate'],
            order: [['endDate', 'ASC']]
        });

        const nextClosingSession = activeSessions[0] || null;
        const cycleRemainingDays = nextClosingSession
            ? Math.max(0, Math.ceil((new Date(nextClosingSession.endDate).getTime() - todayStart.getTime()) / (24 * 60 * 60 * 1000)))
            : null;

        res.json({
            count: students?.length || 0,
            date: today.toLocaleDateString('en-IN'),
            revenue: dailyRevenue || 0,
            monthlyTotal: monthlyTotal || 0,
            target: parseFloat(targetRecord?.value || 5000000), // Default 5M if no target set
            cycleRemainingDays,
            activeSessionName: nextClosingSession?.name || null,
            details: students || []
        });
    } catch (error) {
        console.error("[DASHBOARD_ERROR] GET /reports/daily-admissions failure:", error.message, error.stack);
        res.status(500).json({ error: 'Failed to sync daily admission stream', details: error.message });
    }
});

router.get('/thresholds', verifyToken, (req, res) => res.json(THRESHOLDS));

export default router;
