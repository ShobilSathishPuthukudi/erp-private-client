import express from 'express';
import { models, sequelize } from '../models/index.js';
import { Op } from 'sequelize';
const router = express.Router();
const { Task, Student, Payment, User, Department, Target } = models;

// Threshold definitions (configurable)
const THRESHOLDS = {
  completionRate: { red: 60, amber: 85, green: 100 },
  turnaroundHours: { red: 72, amber: 48, green: 24 },
  revenuePerCenter: { red: 50000, amber: 150000, green: 500000 }
};

// Dept Admin Metrics
router.get('/metrics/:deptId', async (req, res) => {
  try {
    const { deptId } = req.params;
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 1. Task Completion Rate
    const tasks = await Task.findAll({
      where: { 
        createdAt: { [Op.gt]: thirtyDaysAgo }
        // Add dept filter if Task model has it
      }
    });
    const completed = tasks.filter(t => t.status === 'completed').length;
    const completionRate = tasks.length > 0 ? (completed / tasks.length) * 100 : 0;

    // 2. Revenue per Center (Finance-centric)
    const revenue = await Payment.findAll({
      where: { 
        status: 'verified',
        createdAt: { [Op.gt]: thirtyDaysAgo }
      },
      include: [{ model: Student, as: 'student', include: [{ model: Department, as: 'center' }] }]
    });

    // 3. Admission-to-Enrollment Cycle Time (Ops)
    // Simplified logic: Avg(Payment.verifiedAt - Student.createdAt)
    const cycleTimes = await Student.findAll({
       where: { status: 'ENROLLED', createdAt: { [Op.gt]: thirtyDaysAgo } },
       include: [{ model: Payment, as: 'payments', where: { status: 'verified' } }]
    });

    // Aggregating for trends (Mocking sparkline data for forensic demonstration)
    const sparkline = Array.from({ length: 30 }, () => Math.floor(Math.random() * 40) + 60);

    const metrics = [
      { 
        id: 'completion-rate',
        label: 'Task Completion Rate', 
        value: `${completionRate.toFixed(1)}%`,
        trend: sparkline,
        status: completionRate < THRESHOLDS.completionRate.red ? 'red' : (completionRate < THRESHOLDS.completionRate.amber ? 'amber' : 'green')
      },
      {
        id: 'overdue-tasks',
        label: 'Overdue Tasks',
        value: tasks.filter(t => t.status !== 'completed' && new Date(t.dueDate) < today).length,
        trend: sparkline.map(v => v/4),
        status: tasks.filter(t => t.status !== 'completed' && new Date(t.dueDate) < today).length > 5 ? 'red' : 'green'
      }
    ];

    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Finance: Daily Admission Report
router.get('/reports/daily-admissions', async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const enrollments = await Student.findAll({
      where: { 
        createdAt: { [Op.gte]: startOfDay },
        status: 'ENROLLED'
      },
      include: [
        { model: Department, as: 'center', attributes: ['name'] },
        { model: Department, as: 'department', attributes: ['name'] }
      ]
    });

    const revenue = await Payment.sum('amount', {
      where: { 
        createdAt: { [Op.gte]: startOfDay },
        status: 'verified'
      }
    });

    // Target comparison
    const monthlyTarget = await Target.findOne({
       where: { metric: 'revenue', status: 'active' },
       order: [['startDate', 'DESC']]
    });

    res.json({
      date: new Date().toISOString().split('T')[0],
      count: enrollments.length,
      revenue: revenue || 0,
      monthlyTotal: (revenue || 0) * 12, // Mocking monthly aggregation
      target: monthlyTarget?.value || 1000000,
      details: enrollments
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/thresholds', (req, res) => res.json(THRESHOLDS));

export default router;
