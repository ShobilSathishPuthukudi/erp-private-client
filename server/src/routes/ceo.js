import express from 'express';
import { Op } from 'sequelize';
import { models } from '../models/index.js';
import { verifyToken } from '../middleware/verifyToken.js';
import { applyExecutiveScope } from '../middleware/visibility.js';

const router = express.Router();
const { User, Student, Invoice, Task, Leave, Department, AuditLog, CEOPanel, Program, Lead, OrgConfig } = models;

const isCEO = (req, res, next) => {
  const role = req.user.role?.toLowerCase()?.trim();
  if (role !== 'ceo' && role !== 'organization admin') {
    return res.status(403).json({ error: 'Access denied: CEO privileges required' });
  }
  next();
};

// --- Aggregate Global Metrics ---
router.get('/metrics', verifyToken, isCEO, applyExecutiveScope, async (req, res) => {
  try {
    const { restricted, deptIds: scopeIds = [], names: scopeNames = [] } = req.visibility;
    
    // For unrestricted admins, fetch all active departments for the breakdown
    let deptIds = scopeIds;
    let names = scopeNames;
    if (!restricted) {
      const allDepts = await Department.findAll({ 
        where: { 
          status: 'active',
          type: {
            [Op.or]: [
              { [Op.notIn]: ['branch', 'branches'] },
              { [Op.is]: null }
            ]
          }
        }, 
        attributes: ['id', 'name'] 
      });
      deptIds = allDepts.map(d => d.id);
      names = [...allDepts.map(d => d.name), 'Global(All)', 'all'];
    }
    const now = new Date();
    const configs = await OrgConfig.findAll({ where: { group: 'governance' } });
    const taskGrace = parseInt(configs.find(c => c.key === 'taskEscalationGraceHours')?.value || 24);
    const gracePeriodThreshold = new Date(now.getTime() - taskGrace * 60 * 60 * 1000);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    
    // Scoped filters for different models
    const whereStudent = restricted ? {
      [Op.or]: [
        { deptId: { [Op.in]: deptIds } },
        { subDepartmentId: { [Op.in]: deptIds } }
      ]
    } : {};

    const whereUser = restricted ? {
      [Op.or]: [
        { deptId: { [Op.in]: deptIds } },
        { subDepartment: { [Op.in]: names } }
      ]
    } : {};

    // 1. Core KPIs
    const totalStudents = await Student.count({ where: whereStudent });
    
    // Universities and Programs are scoped to departments
    const univWhere = { 
      type: 'university', 
      status: 'active',
      ...(restricted ? { 
        [Op.or]: [
          { id: { [Op.in]: deptIds } },
          { parentId: { [Op.in]: deptIds } }
        ]
      } : {})
    };
    const totalUniversities = await Department.count({ where: univWhere });
    
    const totalPrograms = await Program.count({ 
      where: {
        status: 'active',
        ...(restricted ? { subDeptId: { [Op.in]: deptIds } } : {})
      }
    });
    
    const centerWhere = { 
      type: 'partner-center', 
      status: 'active',
      ...(restricted ? { 
        [Op.or]: [
          { id: { [Op.in]: deptIds } },
          { parentId: { [Op.in]: deptIds } }
        ]
      } : {})
    };
    const activeCenters = await Department.count({ where: centerWhere });
    
    const isFinance = names.some(n => n?.toLowerCase().includes('finance') || n?.toLowerCase().includes('account'));

    // Revenue Calcs
    const allInvoices = await Invoice.findAll({ 
      attributes: ['total', 'createdAt'],
      where: { status: 'paid' },
      include: [{
        model: Student,
        as: 'student',
        required: true,
        where: isFinance ? {} : whereStudent
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
      where: { 
        status: { [Op.ne]: 'completed' },
        deadline: { [Op.lt]: gracePeriodThreshold }
      },
      include: [{
        model: User,
        as: 'assignee',
        required: true,
        where: whereUser
      }]
    });

    const pendingLeaves = await Leave.count({
      where: { 
        status: { [Op.in]: ['pending admin', 'pending hr'] }
      },
      include: [{
        model: User,
        as: 'employee',
        required: true,
        where: whereUser
      }]
    });

    const auditExceptions = await AuditLog.count({
      where: {
        action: { [Op.in]: ['DELETE', 'UNAUTHORIZED_ATTEMPT'] },
        timestamp: { [Op.gt]: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
        ...(restricted ? { userId: { [Op.in]: await User.findAll({ where: whereUser, attributes: ['uid'] }).then(users => users.map(u => u.uid)) } } : {})
      }
    });

    // 2. High-Fidelity Performance Metrics
    const totalTasksAll = await Task.count({ include: [{ model: User, as: 'assignee', where: whereUser }] });
    const completedTasksCount = await Task.count({ where: { status: 'completed' }, include: [{ model: User, as: 'assignee', where: whereUser }] });
    const taskCompletionRate = totalTasksAll > 0 ? Math.round((completedTasksCount / totalTasksAll) * 100) : 100;

    const completedTasksData = await Task.findAll({
      where: { status: 'completed' },
      include: [{ model: User, as: 'assignee', where: whereUser }],
      limit: 100 // Sample for speed
    });
    
    const avgTaskTime = completedTasksData.length > 0 
      ? Math.round(completedTasksData.reduce((sum, t) => sum + (new Date(t.completedAt) - new Date(t.createdAt)), 0) / completedTasksData.length / (1000 * 60 * 60))
      : 0;

    // Admission-to-Enrollment Cycle Time (Simulated via Lead -> Student email match)
    const convertedLeads = await Lead.findAll({ where: { status: 'CONVERTED' }, limit: 50 });
    const studentsWithLeads = await Student.findAll({ where: { email: { [Op.in]: convertedLeads.map(l => l.email) } } });
    const cycleTimes = studentsWithLeads.map(s => {
      const lead = convertedLeads.find(l => l.email === s.email);
      if (!lead) return null;
      return new Date(s.createdAt) - new Date(lead.createdAt);
    }).filter(t => t !== null);
    
    const avgCycleTime = cycleTimes.length > 0 ? Math.round(cycleTimes.reduce((sum, t) => sum + t, 0) / cycleTimes.length / (1000 * 60 * 60 * 24)) : 0;

    // Productivity Score (Balanced index)
    const timeEfficiency = avgTaskTime > 0 ? Math.min(100, Math.max(0, (72 - avgTaskTime) / 72 * 100)) : (totalTasksAll > 0 ? 0 : 100);
    const baseScore = Math.round((taskCompletionRate * 0.6) + (timeEfficiency * 0.4));
    const escalationPenalty = Math.min(40, overdueTasks * 10); // Penalize heavily for overdue escalations
    const productivityScore = Math.max(0, baseScore - escalationPenalty);

    // 3. Advanced Risk Metrics
    const highValuePending = await Invoice.count({
      where: { 
        status: 'issued',
        total: { [Op.gt]: 50000 },
        createdAt: { [Op.lt]: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) }
      },
      include: (restricted && !isFinance) ? [{
        model: Student,
        as: 'student',
        required: true,
        where: whereStudent
      }] : []
    });

    const revealRequests = await AuditLog.count({
      where: {
        action: 'CREDENTIAL_REVEAL',
        timestamp: { [Op.gt]: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
        ...(restricted ? { userId: { [Op.in]: await User.findAll({ where: whereUser, attributes: ['uid'] }).then(users => users.map(u => u.uid)) } } : {})
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
          ...whereStudent,
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

    // 3. Institutional Growth (Last 6 Months) - Scoped
    const growthData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const monthName = d.toLocaleString('default', { month: 'short' });
      
      const [studentCount, staffCount] = await Promise.all([
        Student.count({ where: { ...whereStudent, createdAt: { [Op.lte]: monthEnd } } }),
        User.count({ where: { ...whereUser, role: { [Op.ne]: 'student' }, createdAt: { [Op.lte]: monthEnd } } })
      ]);
      
      growthData.push({ name: monthName, students: studentCount, employees: staffCount });
    }

    // 4. Center Growth (Last 7 Days) - Scoped
    const centerGrowth = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const endOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
      const dayName = d.toLocaleString('default', { weekday: 'short' });
      
      const leads = await Department.count({
        where: { 
          type: { [Op.in]: ['partner centers', 'partner-center'] },
          createdAt: { [Op.lte]: endOfDay },
          ...(restricted ? { 
            [Op.or]: [
              { id: { [Op.in]: deptIds } },
              { parentId: { [Op.in]: deptIds } }
            ]
          } : {})
        }
      });

      const approved = await Department.count({
        where: { 
          type: { [Op.in]: ['partner centers', 'partner-center'] },
          status: 'active',
          createdAt: { [Op.lte]: endOfDay },
          ...(restricted ? { 
            [Op.or]: [
              { id: { [Op.in]: deptIds } },
              { parentId: { [Op.in]: deptIds } }
            ]
          } : {})
        }
      });
      centerGrowth.push({ day: dayName, leads, approved });
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
      taskCompletionRate,
      avgTaskTime,
      avgCycleTime,
      productivityScore,
      highValuePending,
      revealRequests,
      enrollmentTrend,
      revenueTrend,
      growthData,
      centerGrowth,
      salesIntelligence: names.some(n => n?.toLowerCase().includes('sales & crm admin') || n?.toLowerCase().includes('sales intelligence')) ? {
        totalLeads: await Lead.count({ 
          where: restricted ? {
            [Op.or]: [
              { '$assignee.deptId$': { [Op.in]: deptIds } },
              { '$assignee.subDepartment$': { [Op.in]: names } }
            ]
          } : {},
          include: [{ model: User, as: 'assignee', required: true }]
        }),
        convertedLeads: await Lead.count({ 
          where: { 
            status: 'CONVERTED',
            ...(restricted ? {
              [Op.or]: [
                { '$assignee.deptId$': { [Op.in]: deptIds } },
                { '$assignee.subDepartment$': { [Op.in]: names } }
              ]
            } : {})
          },
          include: [{ model: User, as: 'assignee', required: true }]
        }),
        avgLeadAge: Math.round((await Lead.findAll({
          where: { 
            status: 'CONVERTED',
            ...(restricted ? {
              [Op.or]: [
                { '$assignee.deptId$': { [Op.in]: deptIds } },
                { '$assignee.subDepartment$': { [Op.in]: names } }
              ]
            } : {})
          },
          include: [{ model: User, as: 'assignee', required: true }],
          limit: 100,
          attributes: ['createdAt', 'updatedAt']
        })).reduce((sum, l) => sum + (new Date(l.updatedAt) - new Date(l.createdAt)), 0) / 100 / (1000 * 60 * 60 * 24)) || 5
      } : null,
      departmentalBreakdown: await Promise.all((await Department.findAll({ attributes: ['id', 'name'], where: { id: { [Op.in]: deptIds } } })).map(async (dept) => {
        const dId = dept.id;
        const name = dept.name;
        const students = await Student.count({ 
          where: { [Op.or]: [{ deptId: dId }, { subDepartmentId: dId }] } 
        });
        const revenue = allInvoices
          .filter(inv => inv.student?.deptId === dId || inv.student?.subDepartmentId === dId)
          .reduce((sum, inv) => sum + parseFloat(inv.total), 0);
        const overdueTasksCount = await Task.count({
          where: { status: 'overdue' },
          include: [{
            model: User,
            as: 'assignee',
            where: { [Op.or]: [{ deptId: dId }, { subDepartment: name }] }
          }]
        });
        const pendingLeavesCount = await Leave.count({
          where: { status: { [Op.in]: ['pending admin', 'pending hr'] } },
          include: [{
            model: User,
            as: 'employee',
            where: { [Op.or]: [{ deptId: dId }, { subDepartment: name }] }
          }]
        });
        return { id: dId, name, students, revenue, overdueTasks: overdueTasksCount, pendingLeaves: pendingLeavesCount };
      })),
      visibilityScope: names
    });
  } catch (error) {
    console.error('Fetch CEO metrics error:', error);
    res.status(500).json({ error: 'Failed to fetch global metrics' });
  }
});

// --- System Escalations ---
router.get('/escalations', verifyToken, isCEO, applyExecutiveScope, async (req, res) => {
  try {
    const { restricted, deptIds, names } = req.visibility;
    console.log(`[CEO-DEBUG] UID: ${req.user.uid} | Restricted: ${restricted} | DeptIds: ${deptIds} | Names: ${names}`);
    const whereUser = restricted ? {
      [Op.or]: [
        { deptId: { [Op.in]: deptIds } },
        { subDepartment: { [Op.in]: names } }
      ]
    } : {};
    const now = new Date();
    const configs = await OrgConfig.findAll({ where: { group: 'governance' } });
    const taskGrace = parseInt(configs.find(c => c.key === 'taskEscalationGraceHours')?.value || 24);
    const gracePeriodThreshold = new Date(now.getTime() - taskGrace * 60 * 60 * 1000);

    // 1. Fetch overdue tasks that have passed the 48H grace period
    const tasksRaw = await Task.findAll({
      where: { 
        status: { [Op.ne]: 'completed' },
        deadline: { [Op.lt]: gracePeriodThreshold } // Passed grace period
      },
      include: [
        { 
          model: User, 
          as: 'assignee', 
          attributes: ['uid', 'name', 'email', 'deptId'], 
          required: true,
          where: whereUser,
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
        isCritical: true,
        escalationLabel: 'Critical Escalation - Department Admin Inaction',
        deptAdmin: task.assignee?.department?.admin,
        moduleSource: task.module || 'General' // Default if not specified
      };
    });

    // 2. Fetch aged leave requests
    const leavesRaw = await Leave.findAll({
      where: { 
        status: { [Op.in]: ['pending admin', 'pending hr'] }
      },
      include: [
        { 
          model: User, 
          as: 'employee', 
          attributes: ['uid', 'name', 'email'], 
          required: true,
          where: whereUser,
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
router.get('/performance', verifyToken, isCEO, applyExecutiveScope, async (req, res) => {
  try {
    const { restricted, deptIds } = req.visibility;
    const whereDept = restricted ? { id: { [Op.in]: deptIds } } : {};

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
        where: { status: 'completed', completedAt: { [Op.lte]: Sequelize.col('deadline') } },
        include: [{ model: User, as: 'assignee', where: { deptId: dept.id } }] 
      });
      const slaCompliance = totalTasks > 0 ? (onTimeTasks / totalTasks) * 100 : 100;

      // 2. Volume & Risk Metrics
      const students = await Student.count({ where: { deptId: dept.id } });
      const pendingLeaves = await Leave.count({
        where: { status: { [Op.in]: ['pending admin', 'pending hr'] } },
        include: [{ model: User, as: 'employee', where: { deptId: dept.id } }]
      });
      const overdueTasks = await Task.count({
        where: { status: { [Op.ne]: 'completed' }, deadline: { [Op.lt]: now } },
        include: [{ model: User, as: 'assignee', where: { deptId: dept.id } }]
      });

      // 3. Revenue Achievement (Actual vs Target - simulated target)
      const invoiceData = await Invoice.findAll({
        attributes: ['total'],
        where: { status: 'paid' },
        include: [{ 
          model: Student, 
          as: 'student', 
          required: true,
          where: { deptId: dept.id } 
        }]
      });
      const revenue = invoiceData.reduce((sum, inv) => sum + parseFloat(inv.total), 0);
      
      const target = 1000000; // Simulated 1M target per dept
      const revAchievement = Math.min(100, (revenue / target) * 100);

      return {
        id: dept.id,
        name: dept.name,
        students,
        revenue,
        pendingLeaves,
        overdueTasks,
        slaCompliance,
        revAchievement
      };
    }));

    res.json(performanceData);
  } catch (error) {
    console.error('Fetch performance error:', error);
    res.status(500).json({ error: 'Failed to fetch performance metrics' });
  }
});

// --- Individual Employee Performance Scorecard ---
router.get('/performance/employees', verifyToken, isCEO, applyExecutiveScope, async (req, res) => {
  try {
    const { restricted, deptIds, names } = req.visibility;
    const whereUser = restricted ? {
      [Op.or]: [
        { deptId: { [Op.in]: deptIds } },
        { subDepartment: { [Op.in]: names } }
      ]
    } : {};

    const users = await User.findAll({
      where: { ...whereUser, status: 'active' },
      attributes: ['uid', 'name', 'email', 'role', 'subDepartment', 'deptId'],
      include: [{ model: Department, as: 'department', attributes: ['name'] }]
    });

    const now = new Date();
    const configs = await OrgConfig.findAll({ where: { group: 'governance' } });
    const taskGrace = parseInt(configs.find(c => c.key === 'taskEscalationGraceHours')?.value || 24);
    const gracePeriodThreshold = new Date(now.getTime() - taskGrace * 60 * 60 * 1000);

    const employeePerformance = await Promise.all(users.map(async (user) => {
      // 1. Task Score (40%)
      const totalTasks = await Task.count({ where: { assignedTo: user.uid } });
      const overdueTasks = await Task.count({ 
        where: { 
          assignedTo: user.uid, 
          status: { [Op.ne]: 'completed' },
          deadline: { [Op.lt]: gracePeriodThreshold }
        } 
      });
      const taskScore = totalTasks > 0 ? Math.max(0, 100 - (overdueTasks / totalTasks * 100)) : 100;

      // 2. Leave Score (20%) - Deduct for aged pending leaves
      const agedLeaves = await Leave.count({
        where: {
          employeeId: user.uid,
          status: { [Op.in]: ['pending admin', 'pending hr'] },
          createdAt: { [Op.lt]: new Date(now.getTime() - 48 * 60 * 60 * 1000) }
        }
      });
      const leaveScore = Math.max(0, 100 - (agedLeaves * 10));

      // 3. Sales Score (40% - only if Sales Dept)
      let salesScore = 100;
      let leadCount = 0;
      const isSales = user.subDepartment?.toLowerCase().includes('sales') || user.department?.name?.toLowerCase().includes('sales');
      
      if (isSales) {
        leadCount = await Lead.count({ where: { assignedTo: user.uid } });
        const convertedLeads = await Lead.count({ where: { assignedTo: user.uid, status: 'CONVERTED' } });
        salesScore = leadCount > 0 ? (convertedLeads / leadCount * 100) : 0;
      }

      // Weighted Productivity Score
      const productivityScore = isSales 
        ? Math.round((taskScore * 0.4) + (leaveScore * 0.2) + (salesScore * 0.4))
        : Math.round((taskScore * 0.7) + (leaveScore * 0.3));

      return {
        uid: user.uid,
        name: user.name,
        role: user.role,
        dept: user.department?.name || user.subDepartment,
        metrics: {
          overdueTasks,
          agedLeaves,
          leadCount,
          taskScore,
          leaveScore,
          salesScore
        },
        productivityScore
      };
    }));

    res.json(employeePerformance.sort((a, b) => b.productivityScore - a.productivityScore));
  } catch (error) {
    console.error('Fetch employee performance error:', error);
    res.status(500).json({ error: 'Failed to fetch employee performance metrics' });
  }
});

// --- Fetch Dept Users for Reassignment ---
router.get('/dept-users/:deptId', verifyToken, isCEO, async (req, res) => {
  try {
    const { deptId } = req.params;
    const users = await User.findAll({
      where: { 
        deptId,
        status: 'active'
      },
      attributes: ['uid', 'name', 'email', 'role']
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch department users' });
  }
});

// --- CEO Actions: Reassign Task ---
router.post('/reassign-task', verifyToken, isCEO, async (req, res) => {
  try {
    const { role } = req.user;
    /* if (role === 'ceo') {
      return res.status(403).json({ error: 'Access denied: CEO panel is in Read-Only oversight mode' });
    } */
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

// --- CEO Actions: Resolve Task (Executive Override) ---
router.post('/resolve-task', verifyToken, isCEO, async (req, res) => {
  try {
    const { role } = req.user;
    /* if (role === 'ceo') {
      return res.status(403).json({ error: 'Access denied: CEO panel is in Read-Only oversight mode' });
    } */
    const { taskId, resolutionNotes } = req.body;
    const task = await Task.findByPk(taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    task.status = 'completed';
    task.remarks = `[EXECUTIVE_OVERRIDE]: ${resolutionNotes}`;
    await task.save();

    await AuditLog.create({
      userId: req.user.uid,
      action: 'CEO_RESOLVE_TASK',
      entity: 'Task',
      module: 'Executive',
      after: { resolutionNotes },
      timestamp: new Date()
    });

    res.json({ message: 'Task resolved by executive directive' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to resolve task' });
  }
});

// --- CEO Actions: Override Leave (Approve/Reject) ---
router.post('/resolve-leave', verifyToken, isCEO, async (req, res) => {
  try {
    const { role } = req.user;
    /* if (role === 'ceo') {
      return res.status(403).json({ error: 'Access denied: CEO panel is in Read-Only oversight mode' });
    } */
    const { leaveId, action, notes } = req.body; // action: 'approve' | 'reject'
    const leave = await Leave.findByPk(leaveId);
    if (!leave) return res.status(404).json({ error: 'Leave request not found' });

    leave.status = action === 'approve' ? 'approved' : 'rejected';
    leave.remarks = `[EXECUTIVE_OVERRIDE]: ${notes}`;
    if (action === 'approve') {
       leave.step1By = req.user.uid;
       leave.step2By = req.user.uid;
    }
    await leave.save();

    await AuditLog.create({
      userId: req.user.uid,
      action: `CEO_LEAVE_${action.toUpperCase()}`,
      entity: 'Leave',
      module: 'Executive',
      after: { notes },
      timestamp: new Date()
    });

    res.json({ message: `Leave request ${action}ed by executive directive` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to override leave' });
  }
});

// --- CEO Governance: Policies (SLA, Risk, etc.) ---
router.get('/policies', verifyToken, isCEO, async (req, res) => {
  try {
    const configs = await OrgConfig.findAll({ where: { group: 'governance' } });
    const policies = configs.reduce((acc, c) => ({ ...acc, [c.key]: c.value }), {
      leaveSlaDays: 2,
      taskSlaDays: 3,
      taskEscalationGraceHours: 48,
      leaveEscalationGraceHours: 48,
      highValueThreshold: 50000,
      riskTriggers: ['CREDENTIAL_REVEAL', 'DELETE_ACTION']
    });
    res.json(policies);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch policies' });
  }
});

router.post('/policies', verifyToken, isCEO, async (req, res) => {
  try {
    const { role } = req.user;
    /* if (role === 'ceo') {
      return res.status(403).json({ error: 'Access denied: CEO panel is in Read-Only oversight mode' });
    } */
    const updates = req.body;
    for (const [key, value] of Object.entries(updates)) {
      await OrgConfig.upsert({
        key,
        value,
        group: 'governance'
      });
    }
    
    await AuditLog.create({
      userId: req.user.uid,
      action: 'CEO_UPDATE_POLICIES',
      entity: 'OrgConfig',
      module: 'Executive',
      after: updates,
      timestamp: new Date()
    });

    res.json({ message: 'Governance policies updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update policies' });
  }
});

// --- Drilled Details for Brief View ---
router.get('/details/:type', verifyToken, isCEO, applyExecutiveScope, async (req, res) => {
  const { type } = req.params;
  const { restricted, deptIds, names } = req.visibility;
  const { dId } = req.query; // For specific department drills

  try {
    let data = [];
    const isFinance = names.some(n => n?.toLowerCase().includes('finance') || n?.toLowerCase().includes('account'));
    
    const whereStudent = restricted ? {
      [Op.or]: [
        { deptId: { [Op.in]: deptIds } },
        { subDepartmentId: { [Op.in]: deptIds } }
      ]
    } : {};

    const whereUser = restricted ? {
      [Op.or]: [
        { deptId: { [Op.in]: deptIds } },
        { subDepartment: { [Op.in]: names } }
      ]
    } : {};

    switch (type) {
      case 'universities':
        data = await Department.findAll({
          where: { 
            type: 'university', 
            status: 'active',
            ...(restricted ? { name: { [Op.in]: names } } : {})
          },
          attributes: ['id', 'name', 'type'],
          include: [{ model: User, as: 'admin', attributes: ['name'] }],
          limit: 10
        });
        break;

      case 'centers':
        data = await Department.findAll({
          where: { 
            type: 'partner-center', 
            status: 'active',
            ...(restricted ? { name: { [Op.in]: names } } : {})
          },
          attributes: ['id', 'name', 'type'],
          include: [{ model: User, as: 'admin', attributes: ['name'] }],
          limit: 10
        });
        break;
      
      case 'programs':
        data = await Program.findAll({
          where: { 
            status: 'active',
            ...(restricted ? { universityId: { [Op.in]: deptIds } } : {})
          },
          attributes: ['id', 'name', 'type'],
          include: [{ model: Department, as: 'university', attributes: ['name'] }],
          limit: 10
        });
        break;

      case 'students':
        data = await Student.findAll({
          where: whereStudent,
          attributes: ['id', 'name', 'status', 'createdAt'],
          include: [{ model: Department, as: 'department', attributes: ['name'] }],
          order: [['createdAt', 'DESC']],
          limit: 10
        });
        break;

      case 'revenue':
        data = await Invoice.findAll({
          where: { status: 'paid' },
          attributes: ['invoiceNo', 'total', 'createdAt'],
          include: [{ 
            model: Student, 
            as: 'student', 
            attributes: ['name'],
            where: isFinance ? {} : whereStudent 
          }],
          order: [['createdAt', 'DESC']],
          limit: 10
        });
        break;

      case 'risk_aged':
        const now = new Date();
        const configs = await OrgConfig.findAll({ where: { group: 'governance' } });
        const taskGrace = parseInt(configs.find(c => c.key === 'taskEscalationGraceHours')?.value || 24);
        const gracePeriodThreshold = new Date(now.getTime() - taskGrace * 60 * 60 * 1000);
        
        const overdueTasksData = await Task.findAll({
          where: { 
            status: { [Op.ne]: 'completed' },
            deadline: { [Op.lt]: gracePeriodThreshold }
          },
          include: [
            {
              model: User,
              as: 'assignee',
              required: true,
              where: whereUser,
              attributes: ['name']
            },
            {
              model: User,
              as: 'assigner',
              attributes: ['name']
            }
          ],
          attributes: ['id', 'title', 'deadline', 'createdAt'],
          limit: 10
        });

        const pendingLeavesData = await Leave.findAll({
          where: { 
            status: { [Op.in]: ['pending admin', 'pending hr'] },
            createdAt: { [Op.lt]: new Date(now.getTime() - 48 * 60 * 60 * 1000) }
          },
          include: [{
            model: User,
            as: 'employee',
            required: true,
            where: whereUser,
            attributes: ['name']
          }],
          attributes: ['id', 'type', 'createdAt'],
          limit: 10
        });

        data = [
          ...overdueTasksData.map(t => ({
            ...t.toJSON(),
            module: 'Task',
            daysOverdue: Math.ceil(Math.abs(now.getTime() - new Date(t.deadline).getTime()) / (1000 * 60 * 60 * 24))
          })),
          ...pendingLeavesData.map(l => ({
            id: l.id,
            title: `${l.type} Leave Request`,
            deadline: l.createdAt, // Fallback
            createdAt: l.createdAt,
            assignee: { name: l.employee?.name },
            assigner: { name: 'Employee Request' },
            module: 'Leave',
            daysOverdue: Math.ceil(Math.abs(now.getTime() - new Date(l.createdAt).getTime()) / (1000 * 60 * 60 * 24))
          }))
        ];
        break;

      case 'department':
        if (!dId) return res.status(400).json({ error: 'Department ID required' });
        const dept = await Department.findByPk(dId, {
          include: [{ model: User, as: 'admin', attributes: ['name', 'email'] }]
        });
        
        const nowDept = new Date();
        const configDept = await OrgConfig.findAll({ where: { group: 'governance' } });
        const taskGraceDept = parseInt(configDept.find(c => c.key === 'taskEscalationGraceHours')?.value || 24);
        const graceThresholdDept = new Date(nowDept.getTime() - taskGraceDept * 60 * 60 * 1000);

        const studentsCount = await Student.count({ 
          where: { [Op.or]: [{ deptId: dId }, { subDepartmentId: dId }] } 
        });
        
        const revenueInvoices = await Invoice.findAll({
          attributes: ['total'],
          where: { status: 'paid' },
          include: [{ 
            model: Student, 
            as: 'student', 
            where: { [Op.or]: [{ deptId: dId }, { subDepartmentId: dId }] } 
          }]
        });
        const revenueSum = revenueInvoices.reduce((sum, inv) => sum + parseFloat(inv.total), 0);

        const overdueTCount = await Task.count({
          where: { 
            status: { [Op.ne]: 'completed' },
            deadline: { [Op.lt]: graceThresholdDept }
          },
          include: [{ model: User, as: 'assignee', where: { deptId: dId } }]
        });

        const pendingLCount = await Leave.count({
          where: { status: { [Op.in]: ['pending admin', 'pending hr'] } },
          include: [{ model: User, as: 'employee', where: { deptId: dId } }]
        });

        const overdueTasksDataDept = await Task.findAll({
          where: { 
            status: { [Op.ne]: 'completed' },
            deadline: { [Op.lt]: graceThresholdDept }
          },
          include: [{ model: User, as: 'assignee', where: { deptId: dId }, attributes: ['name'] }],
          attributes: ['id', 'title', 'deadline', 'createdAt'],
          order: [['deadline', 'ASC']],
          limit: 5
        });

        const pendingLeavesDataDept = await Leave.findAll({
          where: { status: { [Op.in]: ['pending admin', 'pending hr'] } },
          include: [{ model: User, as: 'employee', where: { deptId: dId }, attributes: ['name'] }],
          attributes: ['id', 'type', 'createdAt'],
          order: [['createdAt', 'DESC']],
          limit: 5
        });

        data = { 
          ...dept.toJSON(), 
          students: studentsCount, 
          revenue: revenueSum, 
          overdue: overdueTCount,
          pendingLeaves: pendingLCount,
          overdueTasksList: overdueTasksDataDept.map(t => ({
            ...t.toJSON(),
            daysOverdue: Math.ceil(Math.abs(nowDept.getTime() - new Date(t.deadline).getTime()) / (1000 * 60 * 60 * 24))
          })),
          pendingLeavesList: pendingLeavesDataDept.map(l => ({
            id: l.id,
            title: `${l.type} Leave Request`,
            assignee: { name: l.employee?.name },
            createdAt: l.createdAt,
            daysOverdue: Math.ceil(Math.abs(nowDept.getTime() - new Date(l.createdAt).getTime()) / (1000 * 60 * 60 * 24))
          }))
        };
        break;

      default:
        return res.status(400).json({ error: 'Invalid detail type' });
    }

    res.json(data);
  } catch (error) {
    console.error('Fetch brief details error:', error);
    res.status(500).json({ error: 'Failed to fetch brief details' });
  }
});

export default router;
