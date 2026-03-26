import express from 'express';
import { Op } from 'sequelize';
import { models } from '../models/index.js';
import { verifyToken } from '../middleware/verifyToken.js';

const router = express.Router();
const { User, Student, Invoice, Task, Leave, Department, AuditLog, CEOPanel, Program } = models;

const isCEO = (req, res, next) => {
  if (req.user.role !== 'ceo' && req.user.role !== 'org-admin' && req.user.role !== 'system-admin') {
    return res.status(403).json({ error: 'Access denied: CEO privileges required' });
  }
  next();
};

// Helper to get visibility filter
const getVisibilityFilter = async (userId, role) => {
  if (role === 'system-admin' || role === 'org-admin') return null; // Unrestricted

  const panel = await CEOPanel.findOne({ where: { userId, status: 'Active' } });
  if (!panel || !panel.visibilityScope || panel.visibilityScope.length === 0) {
    return { id: [] }; // No access if no panel or empty scope
  }

  // Map scope names to IDs
  const depts = await Department.findAll({
    where: { name: { [Op.in]: panel.visibilityScope } },
    attributes: ['id']
  });
  const deptIds = depts.map(d => d.id);
  return { [Op.in]: deptIds };
};

// --- Aggregate Global Metrics ---
router.get('/metrics', verifyToken, isCEO, async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const deptFilter = await getVisibilityFilter(req.user.uid, req.user.role);
    const whereDept = deptFilter ? { deptId: deptFilter } : {};

    // 1. Core KPIs
    const totalStudents = await Student.count({ where: whereDept });
    
    // Universities and Programs are usually global or linked to departments
    const totalUniversities = await Department.count({ where: { type: 'university', status: 'active' } });
    const totalPrograms = await Program.count();
    
    const centerWhere = { type: 'center', status: 'active' };
    const panel = req.user.role !== 'ceo' ? null : await CEOPanel.findOne({ where: { userId: req.user.uid, status: 'Active' } });
    if (panel && panel.visibilityScope && panel.visibilityScope.length > 0) {
      centerWhere.name = { [Op.in]: panel.visibilityScope };
    }
    const activeCenters = await Department.count({ where: centerWhere });
    
    // Revenue Calcs
    const allInvoices = await Invoice.findAll({ 
      attributes: ['total', 'createdAt'],
      where: { status: 'Paid' },
      include: [{
        model: Student,
        as: 'student',
        required: true,
        where: whereDept
      }]
    });
    
    const totalFundAcquired = allInvoices.reduce((sum, inv) => sum + parseFloat(inv.total), 0);
    const revenueMTD = allInvoices
      .filter(inv => new Date(inv.createdAt) >= startOfMonth)
      .reduce((sum, inv) => sum + parseFloat(inv.total), 0);
    const revenueYTD = allInvoices
      .filter(inv => new Date(inv.createdAt) >= startOfYear)
      .reduce((sum, inv) => sum + parseFloat(inv.total), 0);
    
    const overdueTasks = await Task.count({
      where: { status: 'overdue' },
      include: [{
        model: User,
        as: 'assignee',
        required: true,
        where: whereDept
      }]
    });

    const pendingLeaves = await Leave.count({
      where: { 
        status: { [Op.in]: ['pending_step1', 'pending_step2'] }
      },
      include: [{
        model: User,
        as: 'employee',
        required: true,
        where: whereDept
      }]
    });

    const auditExceptions = await AuditLog.count({
      where: {
        action: { [Op.in]: ['DELETE', 'UNAUTHORIZED_ATTEMPT'] },
        timestamp: { [Op.gt]: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
      }
    });

    // 2. Trend Data (12 Months Rolling)
    const enrollmentTrend = [];
    const revenueTrend = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = d.toLocaleString('default', { month: 'short' });
      
      // Real trend data would be grouped by month in DB, here we simulate growth curve if no data
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      
      const monthEnrolls = await Student.count({
        where: {
          ...whereDept,
          createdAt: { [Op.between]: [monthStart, monthEnd] }
        }
      });

      const monthRev = allInvoices
        .filter(inv => {
          const idate = new Date(inv.createdAt);
          return idate >= monthStart && idate <= monthEnd;
        })
        .reduce((sum, inv) => sum + parseFloat(inv.total), 0);

      enrollmentTrend.push({ name: monthName, students: monthEnrolls });
      revenueTrend.push({ name: monthName, revenue: monthRev });
    }

    res.json({
      totalStudents,
      totalUniversities,
      totalPrograms,
      totalFundAcquired,
      revenueMTD,
      revenueYTD,
      activeCenters,
      overdueTasks,
      pendingLeaves,
      auditExceptions,
      enrollmentTrend,
      revenueTrend
    });
  } catch (error) {
    console.error('Fetch CEO metrics error:', error);
    res.status(500).json({ error: 'Failed to fetch global metrics' });
  }
});

// --- System Escalations ---
router.get('/escalations', verifyToken, isCEO, async (req, res) => {
  try {
    const deptFilter = await getVisibilityFilter(req.user.uid, req.user.role);
    const whereDept = deptFilter ? { deptId: deptFilter } : {};
    const now = new Date();

    // 1. Fetch overdue tasks with full administrative chain
    const tasksRaw = await Task.findAll({
      where: { status: 'overdue' },
      include: [
        { 
          model: User, 
          as: 'assignee', 
          attributes: ['uid', 'name', 'email', 'deptId'], 
          required: true,
          where: whereDept,
          include: [{ 
            model: Department, 
            as: 'department', 
            attributes: ['id', 'name'],
            include: [{ model: User, as: 'admin', attributes: ['name', 'email'] }] 
          }] 
        }
      ]
    });

    const tasks = tasksRaw.map(t => {
      const task = t.toJSON();
      const deadline = new Date(task.deadline);
      const diffTime = Math.abs(now.getTime() - deadline.getTime());
      const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return {
        ...task,
        daysOverdue,
        deptAdmin: task.assignee?.department?.admin,
        moduleSource: task.module || 'General' // Default if not specified
      };
    });

    // 2. Fetch aged leave requests
    const leavesRaw = await Leave.findAll({
      where: { 
        status: { [Op.in]: ['pending_step1', 'pending_step2'] }
      },
      include: [
        { 
          model: User, 
          as: 'employee', 
          attributes: ['uid', 'name', 'email'], 
          required: true,
          where: whereDept,
          include: [{ 
            model: Department, 
            as: 'department', 
            attributes: ['id', 'name'],
            include: [{ model: User, as: 'admin', attributes: ['name', 'email'] }]
          }] 
        }
      ]
    });

    const leaves = leavesRaw.map(l => {
      const leave = l.toJSON();
      const created = new Date(leave.createdAt);
      const diffTime = Math.abs(now.getTime() - created.getTime());
      const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return {
        ...leave,
        daysOverdue,
        deptAdmin: leave.employee?.department?.admin
      };
    });

    res.json({ tasks, leaves });
  } catch (error) {
    console.error('Fetch escalations error:', error);
    res.status(500).json({ error: 'Failed to fetch systemic escalations' });
  }
});

// --- Departmental Performance Scorecard ---
router.get('/performance', verifyToken, isCEO, async (req, res) => {
  try {
    const deptFilter = await getVisibilityFilter(req.user.uid, req.user.role);
    const whereDept = deptFilter ? { id: deptFilter } : {};

    const departments = await Department.findAll({
      where: { ...whereDept, status: 'active' },
      attributes: ['id', 'name', 'type']
    });

    const performanceData = await Promise.all(departments.map(async (dept) => {
      // 1. Task SLA Compliance (% tasks completed on time)
      const totalTasks = await Task.count({ 
        include: [{ model: User, as: 'assignee', where: { deptId: dept.id } }] 
      });
      const onTimeTasks = await Task.count({ 
        where: { status: 'completed' }, // In a real system, would check completionDate <= deadline
        include: [{ model: User, as: 'assignee', where: { deptId: dept.id } }] 
      });
      const slaCompliance = totalTasks > 0 ? (onTimeTasks / totalTasks) * 100 : 100;

      // 2. Leave Utilization (Approved leaves vs available - simulated for now)
      const leaveRequests = await Leave.count({
        include: [{ model: User, as: 'employee', where: { deptId: dept.id } }]
      });
      const approvedLeaves = await Leave.count({
        where: { status: 'approved' },
        include: [{ model: User, as: 'employee', where: { deptId: dept.id } }]
      });
      const leaveUtil = leaveRequests > 0 ? (approvedLeaves / leaveRequests) * 100 : 0;

      // 3. Revenue Achievement (Actual vs Target - simulated target)
      const revenue = await Invoice.sum('total', {
        where: { status: 'Paid' },
        include: [{ 
          model: Student, 
          as: 'student', 
          required: true,
          where: { deptId: dept.id } 
        }]
      }) || 0;
      
      const target = 1000000; // Simulated 1M target per dept
      const revAchievement = Math.min(100, (revenue / target) * 100);

      // 4. Weighted KPI Score
      const kpiScore = (slaCompliance * 0.4) + (leaveUtil * 0.2) + (revAchievement * 0.4);

      return {
        id: dept.id,
        name: dept.name,
        type: dept.type,
        kpiScore: Math.round(kpiScore),
        slaCompliance: Math.round(slaCompliance),
        leaveUtil: Math.round(leaveUtil),
        revAchievement: Math.round(revAchievement),
        trend: Math.random() > 0.5 ? 'up' : 'down' // Simulated monthly trend
      };
    }));

    res.json(performanceData);
  } catch (error) {
    console.error('Fetch performance error:', error);
    res.status(500).json({ error: 'Failed to fetch performance metrics' });
  }
});

// --- CEO Actions: Reassign Task ---
router.post('/reassign-task', verifyToken, isCEO, async (req, res) => {
  try {
    const { taskId, newAssigneeId, newDeadline } = req.body;
    const task = await Task.findByPk(taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const oldAssigneeId = task.assignedTo;
    task.assignedTo = newAssigneeId;
    if (newDeadline) task.deadline = new Date(newDeadline);
    task.status = 'pending'; // Reset status to pending for new assignee
    await task.save();

    // Log in Audit Trail
    await AuditLog.create({
      userId: req.user.uid,
      action: 'CEO_REASSIGN',
      entity: 'Task',
      module: 'Executive',
      before: { oldAssigneeId },
      after: { newAssigneeId },
      timestamp: new Date()
    });

    res.json({ message: 'Task reassigned successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reassign task' });
  }
});

export default router;
