import express from 'express';
import { Op } from 'sequelize';
import sequelize from '../config/db.js';
import { models } from '../models/index.js';
import { verifyToken } from '../middleware/verifyToken.js';
import { applyExecutiveScope } from '../middleware/visibility.js';
import { augmentTaskCollection } from '../utils/taskAugmentation.js';
import { SUB_DEPARTMENTS } from '../config/institutionalStructure.js';
import { createNotification } from './notifications.js';

const ACADEMIC_SUB_DEPT_NAMES = SUB_DEPARTMENTS.map(s => s.name);
const CENTER_TYPES = ['partner-center', 'partner center', 'partner centers', 'study-center', 'study centers', 'Study centers'];
const ACTIVE_STUDENT_STATUSES = ['ENROLLED'];

const router = express.Router();
const { User, Student, Invoice, Task, Leave, Department, AuditLog, CEOPanel, Program, Lead, OrgConfig, IncentivePayout, Target } = models;

const isCEO = (req, res, next) => {
  const role = req.user.role?.toLowerCase()?.trim();
  if (role !== 'ceo' && role !== 'organization admin') {
    return res.status(403).json({ error: 'Access denied: CEO privileges required' });
  }
  next();
};

const resolveTaskLinkForRole = (role = '') => {
  const r = (role || '').toLowerCase().trim();
  if (r === 'employee') return '/dashboard/employee/tasks';
  if (r === 'hr admin' || r === 'hr') return '/dashboard/hr/dept-tasks';
  if (r === 'finance admin' || r === 'finance') return '/dashboard/finance/tasks';
  if (r === 'sales admin' || r === 'sales') return '/dashboard/sales/tasks';
  if (r.includes('operations') || r.includes('academic')) return '/dashboard/operations/tasks';
  if (r === 'ceo') return '/dashboard/ceo/escalations';
  return '/dashboard/tasks';
};

router.get('/roster', verifyToken, isCEO, applyExecutiveScope, async (req, res) => {
  try {
    const { restricted, deptIds = [], names = [] } = req.visibility || {};

    const safeDeptIds = deptIds.length > 0 ? deptIds : [-1];
    const whereUser = restricted ? {
      [Op.or]: [
        { deptId: { [Op.in]: deptIds } },
        { subDepartment: { [Op.in]: names } },
        // Partner center accounts have deptId = their center id.
        // Include centers that are mapped to the scoped departments via center_programs
        { deptId: { [Op.in]: sequelize.literal(`(SELECT DISTINCT centerId FROM center_programs WHERE subDeptId IN (${safeDeptIds.join(',')}))`) } },
        // Alternatively, include users whose role declares them as a partner center and their department's parent is in scope
        { role: { [Op.in]: ['Partner Center', 'partner-center', 'partner center'] } } 
      ]
    } : {};

    const users = await User.findAll({
      where: {
        ...whereUser,
        role: { [Op.notIn]: ['system-admin'] }
      },
      attributes: { exclude: ['password', 'devPassword'] },
      include: [
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name', 'type'],
          required: false
        }
      ],
      order: [['name', 'ASC']]
    });

    res.json({
      users,
      visibilityScope: restricted ? names : ['Global(All)'],
      restricted
    });
  } catch (error) {
    console.error('Fetch institutional roster error:', error);
    res.status(500).json({ error: 'Failed to fetch institutional roster' });
  }
});

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
    const leaveGrace = parseInt(configs.find(c => c.key === 'leaveEscalationGraceHours')?.value || 48);
    const gracePeriodThreshold = new Date(now.getTime() - taskGrace * 60 * 60 * 1000);
    const leaveDeadlockThreshold = new Date(now.getTime() - leaveGrace * 60 * 60 * 1000);

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
    
    // Institutional departments (top-level: type='departments')
    const univWhere = {
      type: 'universities',
      status: { [Op.in]: ['active', 'staged'] }
    };
    const totalUniversities = await Department.unscoped().count({ where: univWhere });

    const totalPrograms = await Program.unscoped().count({
      where: {
        status: 'active'
      }
    });

    const centerWhere = {
      type: { [Op.in]: CENTER_TYPES },
      status: 'active'
    };

    const activeCenters = await Department.unscoped().count({ where: centerWhere });

    const totalStudents = await Student.unscoped().count({
      where: { status: { [Op.in]: ACTIVE_STUDENT_STATUSES } }
    });
    
    const isFinance = names.some(n => n?.toLowerCase().includes('finance') || n?.toLowerCase().includes('account'));

    // Revenue Calcs
    const allInvoices = await Invoice.unscoped().findAll({ 
      attributes: ['total', 'createdAt'],
      where: { status: 'paid' },
      include: [{
        model: Student.unscoped(),
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
    
    const overdueTasks = await Task.unscoped().count({
      where: {
        status: { [Op.ne]: 'completed' },
        escalationLevel: 'CEO'
      }
    });

    const pendingLeaves = await Leave.unscoped().count({
      where: {
        status: { [Op.notIn]: ['approved', 'rejected'] }
      },
      include: [{
        model: User.unscoped(),
        as: 'employee',
        required: true,
        where: whereUser
      }]
    });

    const auditUserIds = restricted ? await User.unscoped().findAll({ 
      where: whereUser, 
      attributes: ['uid'] 
    }).then(users => users.map(u => u.uid)) : [];

    const auditExceptions = await AuditLog.count({
      where: {
        [Op.or]: [
          { action: { [Op.like]: '%DELETE%' } },
          { action: { [Op.like]: '%UNAUTHORIZED%' } }
        ],
        timestamp: { [Op.gt]: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
        ...(restricted ? { userId: { [Op.in]: auditUserIds } } : {})
      }
    });

    // 2. High-Fidelity Performance Metrics
    const totalTasksAll = await Task.unscoped().count({ 
      include: [{ model: User.unscoped(), as: 'assignee', where: whereUser, required: true }] 
    });
    const completedTasksCount = await Task.unscoped().count({ 
      where: { status: 'completed' }, 
      include: [{ model: User.unscoped(), as: 'assignee', where: whereUser, required: true }] 
    });
    const taskCompletionRate = totalTasksAll > 0 ? Math.round((completedTasksCount / totalTasksAll) * 100) : 100;

    const completedTasksDataRaw = await Task.unscoped().findAll({
      where: { status: 'completed' },
      include: [{ model: User.unscoped(), as: 'assignee', where: whereUser, required: true }],
      limit: 100 // Sample for speed
    });
    
    const completedTasksData = augmentTaskCollection(completedTasksDataRaw);

    const avgTaskTime = completedTasksData.length > 0 
      ? Math.round(completedTasksData.reduce((sum, t) => sum + (new Date(t.completedAt) - new Date(t.createdAt)), 0) / completedTasksData.length / (1000 * 60 * 60))
      : 0;

    // Center Acquisition Cycle Time (Lead -> Partner Center matching via centerId)
    const convertedLeads = await Lead.findAll({ 
      where: { 
        status: 'CONVERTED',
        centerId: { [Op.ne]: null }
      }, 
      limit: 50 
    });
    
    const centersWithLeads = await Department.unscoped().findAll({ 
      where: { id: { [Op.in]: convertedLeads.map(l => l.centerId) } },
      attributes: ['id', 'createdAt']
    });
    
    const cycleTimes = centersWithLeads.map(c => {
      const lead = convertedLeads.find(l => l.centerId === c.id);
      if (!lead) return null;
      return new Date(c.createdAt) - new Date(lead.createdAt);
    }).filter(t => t !== null);
    
    const avgCycleTime = cycleTimes.length > 0 ? Math.round(cycleTimes.reduce((sum, t) => sum + t, 0) / cycleTimes.length / (1000 * 60 * 60 * 24)) : 0;

    // Productivity Score (Balanced index)
    // timeEfficiency: use 100 when no completion data (neutral, not penalised)
    const timeEfficiency = avgTaskTime > 0 ? Math.min(100, Math.max(0, (72 - avgTaskTime) / 72 * 100)) : 100;
    const baseScore = Math.round((taskCompletionRate * 0.6) + (timeEfficiency * 0.4));
    const escalationPenalty = Math.min(20, overdueTasks * 4);
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
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
      
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

    // 3. Institutional Growth (Last 6 Months) — new enrollments/staff per month
    const growthData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const monthName = d.toLocaleString('default', { month: 'short' });

      const [studentCount, staffCount] = await Promise.all([
        Student.count({ where: { ...whereStudent, createdAt: { [Op.between]: [monthStart, monthEnd] } } }),
        User.count({ where: { ...whereUser, role: { [Op.notIn]: ['student', 'system-admin'] }, createdAt: { [Op.between]: [monthStart, monthEnd] } } })
      ]);

      growthData.push({ name: monthName, students: studentCount, employees: staffCount });
    }

    // 4. Center Growth (Last 7 Days) — cumulative registrations and activations per day
    const centerGrowth = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const endOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
      const dayName = d.toLocaleString('default', { weekday: 'short' });

      const [leads, approved] = await Promise.all([
        Department.unscoped().count({
          where: {
            type: { [Op.in]: ['partner-center', 'partner center', 'partner centers'] },
            createdAt: { [Op.lte]: endOfDay }
          }
        }),
        Department.unscoped().count({
          where: {
            type: { [Op.in]: ['partner-center', 'partner center', 'partner centers'] },
            status: 'active',
            updatedAt: { [Op.lte]: endOfDay }
          }
        })
      ]);
      centerGrowth.push({ day: dayName, leads, approved });
    }

    // 5. Sales Intelligence (Lead Conversion & Velocity)
    let salesIntelligence = null;
    const hasSalesScope = names.some(n => {
      const l = n?.toLowerCase();
      return l.includes('sales') || l.includes('crm') || l.includes('lead');
    });

    if (hasSalesScope) {
      const siTotalLeads = await Lead.count({ 
        where: restricted ? {
          [Op.or]: [
            { '$assignee.deptId$': { [Op.in]: deptIds } },
            { '$assignee.subDepartment$': { [Op.in]: names } },
            { assignedTo: null }
          ]
        } : {},
        include: [{ model: User, as: 'assignee', required: false }]
      });

      const siConvertedLeads = await Lead.count({ 
        where: { 
          status: 'CONVERTED',
          ...(restricted ? {
            [Op.or]: [
              { '$assignee.deptId$': { [Op.in]: deptIds } },
              { '$assignee.subDepartment$': { [Op.in]: names } },
              { assignedTo: null }
            ]
          } : {})
        },
        include: [{ model: User, as: 'assignee', required: false }]
      });

      const siLeadsForAge = await Lead.findAll({
        where: { 
          status: 'CONVERTED',
          ...(restricted ? {
            [Op.or]: [
              { '$assignee.deptId$': { [Op.in]: deptIds } },
              { '$assignee.subDepartment$': { [Op.in]: names } },
              { assignedTo: null }
            ]
          } : {})
        },
        include: [{ model: User, as: 'assignee', required: false }],
        limit: 100,
        attributes: ['createdAt', 'updatedAt']
      });

      let siAvgLeadAge = 5;
      if (siLeadsForAge && siLeadsForAge.length > 0) {
        const totalAge = siLeadsForAge.reduce((sum, l) => sum + (new Date(l.updatedAt) - new Date(l.createdAt)), 0);
        siAvgLeadAge = Math.round(totalAge / siLeadsForAge.length / (1000 * 60 * 60 * 24)) || 1;
      }

      salesIntelligence = {
        totalLeads: siTotalLeads,
        convertedLeads: siConvertedLeads,
        avgLeadAge: siAvgLeadAge
      };
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
      salesIntelligence,
      departmentalBreakdown: await Promise.all((await Department.findAll({ attributes: ['id', 'name'], where: { id: { [Op.in]: deptIds }, name: { [Op.in]: ACADEMIC_SUB_DEPT_NAMES } } })).map(async (dept) => {
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
          where: { status: { [Op.notIn]: ['approved', 'rejected'] } },
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
    const { restricted, deptIds = [], names = [] } = req.visibility;
    console.log(`[CEO-DEBUG] UID: ${req.user.uid} | Restricted: ${restricted} | DeptIds: ${deptIds?.length || 0} | Names: ${names?.length || 0}`);
    const whereUser = restricted ? {
      [Op.or]: [
        { deptId: { [Op.in]: deptIds } },
        { subDepartment: { [Op.in]: names } }
      ]
    } : {};
    const now = new Date();
    const configs = await OrgConfig.findAll({ where: { group: 'governance' } });
    const taskGrace = parseInt(configs.find(c => c.key === 'taskEscalationGraceHours')?.value || 24);
    const leaveGrace = parseInt(configs.find(c => c.key === 'leaveEscalationGraceHours')?.value || 48);
    const gracePeriodThreshold = new Date(now.getTime() - taskGrace * 60 * 60 * 1000);
    const leaveDeadlockThreshold = new Date(now.getTime() - leaveGrace * 60 * 60 * 1000);

    // 1. Fetch overdue tasks that have passed the 48H grace period
    // CEO-level escalations are cross-departmental — no scope restriction on assignee
    const tasksRaw = await Task.findAll({
      where: {
        status: { [Op.notIn]: ['completed', 'resolved_by_ceo', 'reassigned_escalated'] },
        escalationLevel: 'CEO'
      },
      include: [
        {
          model: User,
          as: 'assignee',
          attributes: ['uid', 'name', 'email', 'deptId'],
          required: true,
          include: [{
            model: Department,
            as: 'department',
            required: false,
            attributes: ['id', 'name'],
            include: [{ model: User, as: 'admin', required: false, attributes: ['name', 'email'] }]
          }]
        },
        {
          model: User,
          as: 'assigner',
          attributes: ['uid', 'name', 'email'],
          required: false
        }
      ]
    });

    const tasks = augmentTaskCollection(tasksRaw).map(t => {
      const task = t;
      const now = new Date();
      const deadline = new Date(task.deadline);
      const diffTime = Math.abs(now.getTime() - deadline.getTime());
      const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return {
        ...task,
        daysOverdue,
        isCritical: true,
        escalationLabel: task.deptAdminDecision === 'GRACE_GRANTED'
          ? 'Critical Escalation - Grace Period Expired'
          : 'Critical Escalation - Department Admin Inaction',
        deptAdmin: task.assignee?.department?.admin,
        moduleSource: task.module || 'General' // Default if not specified
      };
    });

    // 2. Fetch leave deadlocks only after they exceed the governance grace window.
    const leavesRaw = await Leave.findAll({
      where: {
        status: { [Op.notIn]: ['approved', 'rejected'] },
        createdAt: { [Op.lte]: leaveDeadlockThreshold }
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

    const whereTask = restricted ? { departmentId: { [Op.in]: deptIds } } : {};
    console.log(`[CEO-ESCALATIONS] Fetching Resolved - User: ${req.user.uid} | Restricted: ${restricted} | Depts: ${deptIds?.length || 0}`);
    const resolvedTasksRaw = await Task.unscoped().findAll({
      where: {
        escalationLevel: 'CEO',
        status: { [Op.in]: ['completed', 'reassigned_escalated', 'resolved_by_ceo'] },
        ...whereTask
      },
      include: [
        {
          model: User,
          as: 'assignee',
          attributes: ['uid', 'name', 'email'],
          include: [{ 
            model: Department, 
            as: 'department', 
            attributes: ['id', 'name'],
            include: [{ model: User, as: 'admin', attributes: ['name', 'email'] }]
          }]
        }
      ],
      order: [['updatedAt', 'DESC']],
      limit: 50
    });

    console.log(`[CEO-ESCALATIONS] Found ${resolvedTasksRaw.length} resolved tasks.`);

    const resolvedTasks = resolvedTasksRaw.map(t => {
      const task = t.toJSON();
      return {
        ...task,
        deptAdmin: task.assignee?.department?.admin,
        moduleSource: task.module || 'General'
      };
    });

    res.json({ tasks, leaves, resolvedTasks });
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
        where: { status: { [Op.notIn]: ['approved', 'rejected'] } },
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

    const EXCLUDED_ROLES = ['ceo', 'organization admin', 'system-admin', 'student', 'partner center'];
    const users = await User.findAll({
      where: {
        ...whereUser,
        status: 'active',
        role: { [Op.notIn]: EXCLUDED_ROLES }
      },
      attributes: ['uid', 'name', 'email', 'role', 'subDepartment', 'deptId'],
      include: [{ model: Department, as: 'department', attributes: ['name'] }]
    });

    const now = new Date();
    const configs = await OrgConfig.findAll({ where: { group: 'governance' } });
    const taskGrace = parseInt(configs.find(c => c.key === 'taskEscalationGraceHours')?.value || 24);
    const gracePeriodThreshold = new Date(now.getTime() - taskGrace * 60 * 60 * 1000);

    const employeePerformance = await Promise.all(users.map(async (user) => {
      // 1. Task Score (70% weight for non-sales)
      const totalTasks = await Task.count({ where: { assignedTo: user.uid } });
      const overdueTasks = await Task.count({
        where: {
          assignedTo: user.uid,
          [Op.or]: [
            { status: 'overdue' },
            { status: { [Op.ne]: 'completed' }, deadline: { [Op.lt]: gracePeriodThreshold } }
          ]
        }
      });
      const taskScore = totalTasks > 0 ? Math.max(0, 100 - (overdueTasks / totalTasks * 100)) : 100;

      // 2. Leave Score (20%) - Deduct for approved leave days exceeding 1/month
      const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthlyApprovedLeaves = await Leave.findAll({
        where: {
          employeeId: user.uid,
          status: 'approved',
          fromDate: { [Op.gte]: startOfCurrentMonth }
        },
        attributes: ['fromDate', 'toDate']
      });
      const leaveDaysThisMonth = monthlyApprovedLeaves.reduce((sum, l) => {
        const days = Math.max(1, Math.ceil((new Date(l.toDate) - new Date(l.fromDate)) / (1000 * 60 * 60 * 24)) + 1);
        return sum + days;
      }, 0);
      const leaveScore = leaveDaysThisMonth <= 1 ? 100 : Math.max(0, 100 - ((leaveDaysThisMonth - 1) * 10));

      // 3. Sales Score (40% - only if Sales Dept)
      let salesScore = 100;
      let leadCount = 0;
      const isSales = user.subDepartment?.toLowerCase().includes('sales') || user.department?.name?.toLowerCase().includes('sales');
      
      if (isSales) {
        leadCount = await Lead.count({ where: { assignedTo: user.uid } });
        const convertedLeads = await Lead.count({ where: { assignedTo: user.uid, status: 'CONVERTED' } });
        // No leads assigned = no data; treat as neutral (100) not failure (0)
        salesScore = leadCount > 0 ? Math.round(convertedLeads / leadCount * 100) : 100;
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
          agedLeaves: leaveDaysThisMonth,
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
router.get('/dept-users/:deptId', verifyToken, isCEO, applyExecutiveScope, async (req, res) => {
  try {
    const { deptId } = req.params;
    const { restricted, deptIds = [] } = req.visibility || {};

    if (restricted && !deptIds.map(String).includes(String(deptId))) {
      return res.status(403).json({ error: 'Access denied: department outside your visibility scope' });
    }

    const DEPT_ADMIN_ROLES = [
      'HR Admin', 'Finance Admin', 'Academic Operations Admin', 'Operations Admin',
      'Sales Admin', 'BVoc Admin', 'Online Admin', 'Open School Admin', 'Skill Admin',
      'Academic Admin', 'Academic Operations Administrator'
    ];

    const users = await User.findAll({
      where: {
        deptId,
        status: 'active',
        role: { [Op.in]: DEPT_ADMIN_ROLES }
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
    const { taskId, newAssigneeId, newDeadline } = req.body;
    const task = await Task.findByPk(taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const oldAssigneeId = task.assignedTo;
    const targetUser = await User.findOne({ where: { uid: newAssigneeId } });
    if (!targetUser) return res.status(404).json({ error: 'Successor not found' });

    // 1. Terminate current task record for performance tracking
    await task.update({ 
      status: 'reassigned_escalated',
      escalationLevel: 'CEO',
      remarks: `CEO REASSIGNMENT: Task reassigned to ${newAssigneeId} due to institutional bottleneck.`
    }, { context: { assigner: req.user } });

    // 1.5 Clear stale notifications GLOBALLY for this task
    try {
      const { clearNotifications } = await import('./notifications.js');
      // Clear for ALL users since this specific task instance is terminated/reassigned
      await clearNotifications({
        messagePatterns: [
          `%${task.title}%`, 
          `%${task.id}%`,
          `%CEO has reassigned%${task.title}%` // Catch legacy GOVERNANCE messages
        ]
      });
    } catch (e) {
      console.error('Clear notifications error:', e);
    }

    // 2. Create NEW task for the successor
    const newTask = await Task.create({
      title: task.title,
      assignedTo: newAssigneeId,
      assignedBy: req.user.uid,
      deadline: newDeadline || task.deadline,
      priority: task.priority,
      status: 'pending',
      departmentId: task.departmentId,
      subDepartmentId: task.subDepartmentId,
      isInstitutionalHandover: true,
      escalationLevel: 'CEO'
    }, { context: { assigner: req.user } });

    // 3. Notify Successor
    try {
      const { createNotification } = await import('./notifications.js');
      await createNotification(req.io, {
        targetUid: newAssigneeId,
        panelScope: targetUser.role,
        title: 'Institutional Mandate - CEO DIRECTIVE',
        message: `You have been assigned a high-priority directive: "${task.title}". CEO oversight is active.`,
        type: 'warning',
        link: resolveTaskLinkForRole(targetUser.role)
      });
    } catch (e) {
      console.error('Notification error:', e);
    }

    // Log in Audit Trail
    await AuditLog.create({
      userId: req.user.uid,
      action: 'CEO_REASSIGN',
      entity: 'Task',
      module: 'Executive',
      before: { oldAssigneeId },
      after: { newAssigneeId, taskId: task.id, newTaskIds: newTask.id },
      timestamp: new Date()
    });

    res.json({ message: 'Task reassigned and new directive issued', newTask });
  } catch (error) {
    console.error('Reassign task error:', error);
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

    task.status = 'resolved_by_ceo';
    task.remarks = `[EXECUTIVE_RESOLUTION]: ${resolutionNotes}`;
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
  const { dId } = req.query;

  console.log(`[CEO-DETAIL-DEBUG] Type: ${type} | Restricted: ${restricted} | DeptIds: ${JSON.stringify(deptIds)}`);

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

    const auditUserIds = restricted ? await User.unscoped().findAll({ 
      where: whereUser, 
      attributes: ['uid'] 
    }).then(users => users.map(u => u.uid)) : [];

    switch (type) {
      case 'universities':
        data = await Department.unscoped().findAll({
          where: {
            type: 'universities',
            status: { [Op.in]: ['active', 'staged'] }
          },
          attributes: ['id', 'name', 'type', 'createdAt'],
          include: [{ 
            model: User.unscoped(), 
            as: 'admin', 
            attributes: ['name', 'email'],
            required: false 
          }],
          limit: 50
        });
        break;

      case 'centers':
        data = await Department.unscoped().findAll({
          where: {
            type: { [Op.in]: CENTER_TYPES },
            status: 'active'
          },
          attributes: ['id', 'name', 'type', 'status', 'createdAt'],
          include: [{ 
            model: User.unscoped(), 
            as: 'admin', 
            attributes: ['name', 'email'],
            required: false 
          }],
          limit: 50
        });
        break;
      
      case 'programs':
        data = await Program.unscoped().findAll({
          where: { 
            status: 'active'
          },
          attributes: ['id', 'name', 'type'],
          include: [{ 
            model: Department.unscoped(), 
            as: 'university', 
            attributes: ['name'],
            required: false 
          }],
          limit: 50
        });
        break;

      case 'enrollments':
      case 'students':
        data = await Student.unscoped().findAll({
          where: {
            status: { [Op.in]: ACTIVE_STUDENT_STATUSES }
          },
          attributes: ['id', 'name', 'status', 'createdAt'],
          include: [{ 
            model: Department.unscoped(), 
            as: 'department', 
            attributes: ['name'],
            required: false 
          }],
          order: [['createdAt', 'DESC']],
          limit: 20
        });
        break;

      case 'revenue':
        data = await Invoice.unscoped().findAll({
          where: { status: 'paid' },
          attributes: ['invoiceNo', 'total', 'createdAt'],
          include: [{ 
            model: Student.unscoped(), 
            as: 'student', 
            attributes: ['name'],
            where: isFinance ? {} : whereStudent,
            required: false
          }],
          order: [['createdAt', 'DESC']],
          limit: 20
        });
        break;

      case 'risk_highval':
        data = await Invoice.unscoped().findAll({
          where: { 
            status: { [Op.ne]: 'paid' },
            total: { [Op.gt]: 50000 }
          },
          attributes: ['invoiceNo', 'total', 'createdAt', 'status'],
          include: [{ 
            model: Student.unscoped(), 
            as: 'student', 
            attributes: ['name'],
            where: isFinance ? {} : whereStudent,
            required: true
          }],
          order: [['total', 'DESC']],
          limit: 20
        });
        break;

      case 'risk_security':
        const nowSec = new Date();
        data = await AuditLog.findAll({
          where: {
            [Op.or]: [
              { action: { [Op.like]: '%Reveal%' } },
              { action: { [Op.like]: '%Decrypt%' } },
              { remarks: { [Op.like]: '%secret%' } },
              { remarks: { [Op.like]: '%credential%' } }
            ],
            timestamp: { [Op.gt]: new Date(nowSec.getTime() - 24 * 60 * 60 * 1000) },
            ...(restricted ? { userId: { [Op.in]: auditUserIds } } : {})
          },
          include: [{ 
            model: User.unscoped(), 
            as: 'user', 
            attributes: ['name', 'email'],
            required: false 
          }],
          order: [['timestamp', 'DESC']],
          limit: 20
        });
        break;

      case 'tasks':
        data = await Task.unscoped().findAll({
          include: [
            { 
              model: User.unscoped(), 
              as: 'assignee', 
              attributes: ['name', 'uid'],
              where: whereUser,
              required: true
            },
            { model: User.unscoped(), as: 'assigner', attributes: ['name', 'uid'] }
          ],
          order: [['createdAt', 'DESC']],
          limit: 50
        });
        break;

      case 'leaves':
        data = await Leave.unscoped().findAll({
          where: {
            status: { [Op.notIn]: ['approved', 'rejected'] }
          },
          include: [
            { 
              model: User.unscoped(), 
              as: 'employee', 
              attributes: ['name', 'uid'],
              where: whereUser,
              required: true,
              include: [{ model: Department, as: 'department', attributes: ['name'] }]
            }
          ],
          order: [['createdAt', 'DESC']],
          limit: 50
        });
        break;

      case 'risk_audit':
        const nowAud = new Date();
        data = await AuditLog.findAll({
          where: {
            [Op.or]: [
              { action: { [Op.like]: '%DELETE%' } },
              { action: { [Op.like]: '%UNAUTHORIZED%' } }
            ],
            timestamp: { [Op.gt]: new Date(nowAud.getTime() - 24 * 60 * 60 * 1000) },
            ...(restricted ? { userId: { [Op.in]: auditUserIds } } : {})
          },
          include: [{ 
            model: User.unscoped(), 
            as: 'user', 
            attributes: ['name', 'email'],
            required: false 
          }],
          order: [['timestamp', 'DESC']],
          limit: 20
        });
        break;

      case 'risk_aged':
        const now = new Date();
        const configs = await OrgConfig.findAll({ where: { group: 'governance' } });
        const taskGrace = parseInt(configs.find(c => c.key === 'taskEscalationGraceHours')?.value || 24);
        const gracePeriodThreshold = new Date(now.getTime() - taskGrace * 60 * 60 * 1000);
        
        const overdueTasksData = await Task.unscoped().findAll({
          where: { 
            status: { [Op.ne]: 'completed' },
            escalationLevel: 'CEO'
          },
          include: [
            {
              model: User.unscoped(),
              as: 'assignee',
              required: false,
              attributes: ['name']
            },
            {
              model: User.unscoped(),
              as: 'assigner',
              attributes: ['name'],
              required: false
            }
          ],
          attributes: ['id', 'title', 'deadline', 'createdAt'],
          limit: 10
        });

        const pendingLeavesData = await Leave.unscoped().findAll({
          where: {
            status: { [Op.notIn]: ['approved', 'rejected'] },
            createdAt: { [Op.lt]: new Date(now.getTime() - 48 * 60 * 60 * 1000) }
          },
          include: [{
            model: User.unscoped(),
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
          where: { status: { [Op.notIn]: ['approved', 'rejected'] } },
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
          where: { status: { [Op.notIn]: ['approved', 'rejected'] } },
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

      case 'perf_prod': {
        const topPerformers = await Task.findAll({
          where: { status: 'completed' },
          include: [{ model: User, as: 'assignee', required: true, where: { ...whereUser, status: 'active' }, attributes: ['uid', 'name', 'role'] }],
          attributes: ['id', 'createdAt', 'updatedAt'],
          order: [['updatedAt', 'DESC']],
          limit: 50
        });
        const scoreMap = {};
        for (const t of topPerformers) {
          const uid = t.assignee?.uid;
          if (!uid) continue;
          if (!scoreMap[uid]) scoreMap[uid] = { name: t.assignee.name, role: t.assignee.role, completed: 0 };
          scoreMap[uid].completed++;
        }
        data = Object.values(scoreMap).sort((a, b) => b.completed - a.completed).slice(0, 10);
        break;
      }

      case 'perf_task': {
        const [completedCount, overdueCount, pendingCount, inProgressCount] = await Promise.all([
          Task.count({ where: { status: 'completed' }, include: [{ model: User, as: 'assignee', required: true, where: whereUser }] }),
          Task.count({ where: { status: 'overdue' }, include: [{ model: User, as: 'assignee', required: true, where: whereUser }] }),
          Task.count({ where: { status: 'pending' }, include: [{ model: User, as: 'assignee', required: true, where: whereUser }] }),
          Task.count({ where: { status: 'in_progress' }, include: [{ model: User, as: 'assignee', required: true, where: whereUser }] })
        ]);
        const total = completedCount + overdueCount + pendingCount + inProgressCount;
        data = { completedCount, overdueCount, pendingCount, inProgressCount, total, completionRate: total > 0 ? Math.round((completedCount / total) * 100) : 100 };
        break;
      }

      case 'perf_avg': {
        const recentCompleted = await Task.findAll({
          where: { status: 'completed' },
          include: [{ model: User, as: 'assignee', required: true, where: whereUser, attributes: ['name'] }],
          attributes: ['id', 'title', 'createdAt', 'updatedAt', 'priority'],
          order: [['updatedAt', 'DESC']],
          limit: 15
        });
        data = recentCompleted.map(t => ({
          id: t.id,
          title: t.title,
          assignee: t.assignee?.name,
          priority: t.priority,
          hoursToComplete: Math.round((new Date(t.updatedAt) - new Date(t.createdAt)) / (1000 * 60 * 60))
        }));
        break;
      }

      case 'perf_cycle': {
        const recentConverted = await Lead.findAll({ where: { status: 'CONVERTED' }, order: [['updatedAt', 'DESC']], limit: 15 });
        const emails = recentConverted.map(l => l.email).filter(Boolean);
        const matchedStudents = emails.length > 0 ? await Student.findAll({ where: { email: { [Op.in]: emails } }, attributes: ['name', 'email', 'createdAt'] }) : [];
        data = recentConverted.map(lead => {
          const student = matchedStudents.find(s => s.email === lead.email);
          return {
            leadName: lead.name || lead.email,
            email: lead.email,
            leadCreated: lead.createdAt,
            enrolledAt: student?.createdAt || null,
            cycleDays: student ? Math.round((new Date(student.createdAt) - new Date(lead.createdAt)) / (1000 * 60 * 60 * 24)) : null
          };
        }).filter(r => r.cycleDays !== null);
        break;
      }

      case 'risk_highval': {
        data = await Invoice.findAll({
          where: {
            status: 'issued',
            total: { [Op.gt]: 50000 },
            createdAt: { [Op.lt]: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) }
          },
          include: [{
            model: Student,
            as: 'student',
            required: true,
            where: (restricted && !isFinance) ? whereStudent : {},
            attributes: ['name', 'email']
          }],
          attributes: ['id', 'invoiceNo', 'total', 'createdAt'],
          order: [['total', 'DESC']],
          limit: 15
        });
        break;
      }

      case 'risk_security': {
        const scopedUserIds = restricted
          ? (await User.findAll({ where: whereUser, attributes: ['uid'] })).map(u => u.uid)
          : null;
        data = await AuditLog.findAll({
          where: {
            action: 'CREDENTIAL_REVEAL',
            timestamp: { [Op.gt]: new Date(Date.now() - 24 * 60 * 60 * 1000) },
            ...(scopedUserIds ? { userId: { [Op.in]: scopedUserIds } } : {})
          },
          attributes: ['id', 'userId', 'action', 'entity', 'timestamp', 'module'],
          order: [['timestamp', 'DESC']],
          limit: 20
        });
        break;
      }

      case 'risk_audit': {
        const scopedUserIdsAudit = restricted
          ? (await User.findAll({ where: whereUser, attributes: ['uid'] })).map(u => u.uid)
          : null;
        data = await AuditLog.findAll({
          where: {
            action: { [Op.in]: ['DELETE', 'UNAUTHORIZED_ATTEMPT'] },
            timestamp: { [Op.gt]: new Date(Date.now() - 24 * 60 * 60 * 1000) },
            ...(scopedUserIdsAudit ? { userId: { [Op.in]: scopedUserIdsAudit } } : {})
          },
          attributes: ['id', 'userId', 'action', 'entity', 'module', 'timestamp'],
          order: [['timestamp', 'DESC']],
          limit: 20
        });
        break;
      }

      case 'employee': {
        const { uid } = req.query;
        if (!uid) return res.status(400).json({ error: 'uid is required for employee drill-down' });

        const emp = await User.findOne({
          where: { uid, ...(restricted ? {
            [Op.or]: [
              { deptId: { [Op.in]: deptIds } },
              { subDepartment: { [Op.in]: names } }
            ]
          } : {}) },
          attributes: ['uid', 'name', 'role', 'deptId', 'subDepartment']
        });
        if (!emp) return res.status(403).json({ error: 'Employee not found or outside scope' });

        const [tasks, leaves] = await Promise.all([
          Task.findAll({
            where: { assignedTo: uid },
            attributes: ['id', 'title', 'status', 'deadline', 'priority'],
            order: [['createdAt', 'DESC']],
            limit: 20
          }),
          Leave.findAll({
            where: { employeeId: uid },
            attributes: ['id', 'type', 'fromDate', 'toDate', 'status'],
            order: [['createdAt', 'DESC']],
            limit: 20
          })
        ]);
        data = { employee: emp, tasks, leaves };
        break;
      }

      default:
        return res.status(400).json({ error: 'Invalid detail type' });
    }

    res.json(data);
  } catch (error) {
    console.error('Fetch brief details error:', error);
    res.status(500).json({ error: 'Failed to fetch brief details' });
  }
});

// --- CEO Incentive Payout Oversight ---
router.get('/incentive-payouts', verifyToken, isCEO, async (req, res) => {
  try {
    const payouts = await IncentivePayout.findAll({
      include: [
        { model: User, as: 'employee', attributes: ['name', 'email', 'role'] },
        { model: Target, as: 'target', attributes: ['id', 'title', 'metric', 'value', 'workflowStatus'] },
      ],
      order: [['createdAt', 'DESC']]
    });

    const summary = {
      totalPayouts: payouts.length,
      totalProcessed: payouts.filter((payout) => payout.status === 'processed').length,
      totalValue: payouts.reduce((sum, payout) => sum + Number(payout.amount || 0), 0),
      processedValue: payouts
        .filter((payout) => payout.status === 'processed')
        .reduce((sum, payout) => sum + Number(payout.amount || 0), 0),
    };

    res.json({ summary, payouts });
  } catch (error) {
    console.error('Fetch incentive payouts error:', error);
    res.status(500).json({ error: 'Failed to fetch incentive payout oversight data' });
  }
});

router.put('/incentive-payouts/:id/approve', verifyToken, isCEO, async (req, res) => {
  return res.status(410).json({ error: 'CEO payout approvals are deprecated. Incentives are processed by Finance and shown here as read-only data.' });
});

// --- CEO Actions: HR Leave Approvals ---
const isHrScopedLeave = (leave) => {
  if (!leave?.employee) return false;

  const role = (leave.employee.role || '').toLowerCase();
  const sub = (leave.employee.subDepartment || '').toLowerCase();
  const deptName = (leave.employee.department?.name || '').toLowerCase();
  const email = (leave.employee.email || '').toLowerCase();
  const name = (leave.employee.name || '').toLowerCase();

  return (
    role.includes('hr') ||
    role.includes('human resources') ||
    sub.includes('hr') ||
    deptName.includes('hr') ||
    email.includes('hr') ||
    name.includes('hr employee')
  );
};

const getLeaveStatusLinkForRole = (role = '') => {
  const normalizedRole = String(role || '').toLowerCase().trim();

  if (normalizedRole.includes('sales')) return '/dashboard/sales/leave-status';
  if (normalizedRole.includes('finance')) return '/dashboard/finance/leave-status';
  if (normalizedRole.includes('operations') || normalizedRole.includes('academic')) return '/dashboard/operations/leave-status';
  if (normalizedRole.includes('open school') || normalizedRole.includes('openschool')) return '/dashboard/subdept/openschool/leave-status';
  if (normalizedRole.includes('online')) return '/dashboard/subdept/online/leave-status';
  if (normalizedRole.includes('skill')) return '/dashboard/subdept/skill/leave-status';
  if (normalizedRole.includes('bvoc')) return '/dashboard/subdept/bvoc/leave-status';
  if (normalizedRole.includes('hr')) return '/dashboard/hr/dept-leave-status';

  return '/dashboard/tasks';
};

router.get('/hr-leaves', verifyToken, isCEO, applyExecutiveScope, async (req, res) => {
  try {
    const leavesRaw = await Leave.unscoped().findAll({
      where: {
        status: { [Op.ne]: 'draft' }
      },
      include: [
        {
          model: User.unscoped(),
          as: 'employee',
          attributes: ['uid', 'name', 'email', 'role', 'subDepartment', 'deptId'],
          include: [{ model: Department, as: 'department', attributes: ['name'] }]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Semantic filtering performed post-DB to definitively bypass SQL relational quirks
    const hrLeaves = leavesRaw.filter(isHrScopedLeave);
    
    res.json(hrLeaves);
  } catch (error) {
    console.error('Fetch CEO HR Leaves Error:', error);
    res.status(500).json({ error: 'Failed to fetch HR Administrator leaves' });
  }
});

router.put('/hr-leaves/:id/approve', verifyToken, isCEO, async (req, res) => {
  try {
    const { id } = req.params;
    const leave = await Leave.findByPk(id, {
      include: [
        {
          model: User.unscoped(),
          as: 'employee',
          attributes: ['uid', 'name', 'email', 'role', 'subDepartment', 'deptId'],
          include: [{ model: Department, as: 'department', attributes: ['name', 'adminId'] }]
        }
      ]
    });
    if (!leave) return res.status(404).json({ error: 'Leave request not found' });
    if (!isHrScopedLeave(leave)) {
      return res.status(403).json({ error: 'This leave request is not eligible for CEO HR leave finalization' });
    }
    if (!['pending_step2', 'pending hr', 'pending_step1', 'pending admin'].includes(leave.status)) {
      return res.status(400).json({ error: `Cannot approve in current status: ${leave.status}` });
    }
    if (leave.employeeId === req.user.uid) {
      return res.status(403).json({ error: 'Governance violation: Institutional actors cannot approve their own requests.' });
    }

    await leave.update({
      status: 'approved',
      step2By: req.user.uid
    });

    await AuditLog.create({
      userId: req.user.uid,
      action: 'CEO_APPROVE_HR_LEAVE',
      entity: 'Leave',
      module: 'Executive',
      after: { leaveId: id, status: 'approved' },
      timestamp: new Date()
    });

    await createNotification(req.io, {
      targetUid: leave.employeeId,
      panelScope: leave.employee?.role || 'Employee',
      title: 'Leave Finalized',
      message: `Your leave request for ${leave.type} (${leave.fromDate} to ${leave.toDate}) has been approved by the CEO.`,
      type: 'success',
      link: '/dashboard/employee/leaves'
    });

    const targetAdminUid = leave.step1By || leave.employee?.department?.adminId;
    if (targetAdminUid && targetAdminUid !== req.user.uid) {
      const targetAdmin = await User.findByPk(targetAdminUid);
      if (targetAdmin) {
        await createNotification(req.io, {
          targetUid: targetAdminUid,
          panelScope: targetAdmin.role,
          title: 'HR Leave Finalized',
          message: `CEO approved the leave request for ${leave.employee?.name || 'team member'}.`,
          type: 'info',
          link: getLeaveStatusLinkForRole(targetAdmin.role)
        });
      }
    }
    
    res.json(leave);
  } catch (error) {
    console.error('Approve HR leave error:', error);
    res.status(500).json({ error: 'Failed to approve leave via executive override' });
  }
});

router.put('/hr-leaves/:id/reject', verifyToken, isCEO, async (req, res) => {
  try {
    const { id } = req.params;
    const leave = await Leave.findByPk(id, {
      include: [
        {
          model: User.unscoped(),
          as: 'employee',
          attributes: ['uid', 'name', 'email', 'role', 'subDepartment', 'deptId'],
          include: [{ model: Department, as: 'department', attributes: ['name', 'adminId'] }]
        }
      ]
    });
    if (!leave) return res.status(404).json({ error: 'Leave request not found' });
    if (!isHrScopedLeave(leave)) {
      return res.status(403).json({ error: 'This leave request is not eligible for CEO HR leave finalization' });
    }
    if (!['pending_step2', 'pending hr', 'pending_step1', 'pending admin'].includes(leave.status)) {
      return res.status(400).json({ error: `Cannot reject in current status: ${leave.status}` });
    }
    if (leave.employeeId === req.user.uid) {
      return res.status(403).json({ error: 'Governance violation: Institutional actors cannot reject their own requests.' });
    }

    await leave.update({
      status: 'rejected',
      step2By: req.user.uid
    });

    await AuditLog.create({
      userId: req.user.uid,
      action: 'CEO_REJECT_HR_LEAVE',
      entity: 'Leave',
      module: 'Executive',
      after: { leaveId: id, status: 'rejected' },
      timestamp: new Date()
    });

    await createNotification(req.io, {
      targetUid: leave.employeeId,
      panelScope: leave.employee?.role || 'Employee',
      title: 'Leave Rejected',
      message: `Your leave request for ${leave.type} (${leave.fromDate} to ${leave.toDate}) was rejected by the CEO.`,
      type: 'error',
      link: '/dashboard/employee/leaves'
    });

    const targetAdminUid = leave.step1By || leave.employee?.department?.adminId;
    if (targetAdminUid && targetAdminUid !== req.user.uid) {
      const targetAdmin = await User.findByPk(targetAdminUid);
      if (targetAdmin) {
        await createNotification(req.io, {
          targetUid: targetAdminUid,
          panelScope: targetAdmin.role,
          title: 'HR Leave Finalized',
          message: `CEO rejected the leave request for ${leave.employee?.name || 'team member'}.`,
          type: 'info',
          link: getLeaveStatusLinkForRole(targetAdmin.role)
        });
      }
    }

    res.json(leave);
  } catch (error) {
    console.error('Reject HR leave error:', error);
    res.status(500).json({ error: 'Failed to reject leave via executive override' });
  }
});

export default router;
