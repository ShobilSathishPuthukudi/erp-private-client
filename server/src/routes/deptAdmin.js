import express from 'express';
import bcrypt from 'bcryptjs';
import { models } from '../models/index.js';
import { verifyToken } from '../middleware/verifyToken.js';
import { Op, fn, col, where as sqlWhere } from 'sequelize';
import { createNotification } from './notifications.js';
import { validateTaskAssignment } from '../utils/rbac/validateTaskAssignment.js';
import { normalizeInstitutionRoleName, normalizeSubDepartmentName, getSubDepartmentNameAliases } from '../config/institutionalStructure.js';

const router = express.Router();
const { User, Task, Leave, Department, AuditLog, CEOPanel, Notification, Lead } = models;

const DEPT_GRACE_HOURS = 24;
const ACADEMIC_PARENT_ADMIN_ROLES = ['academic operations admin', 'operations admin', 'operations', 'academic'];
const STEP_1_PENDING_STATUSES = ['pending admin', 'pending_step1'];

const resolveManagedDepartmentIds = async (deptId, role) => {
  if (!deptId) return [];

  if (!ACADEMIC_PARENT_ADMIN_ROLES.includes(role)) {
    return [deptId];
  }

  const childDepartments = await Department.findAll({
    attributes: ['id'],
    where: { parentId: deptId }
  });

  return [deptId, ...childDepartments.map((department) => department.id)];
};

const resolveUnitScope = async (reqUser) => {
  const subDepartmentAliases = getSubDepartmentNameAliases(reqUser.subDepartment);
  const subDepartmentUnits = await Department.findAll({
    attributes: ['id'],
    where: {
      name: {
        [Op.in]: subDepartmentAliases
      }
    }
  });

  return {
    subDepartmentAliases,
    scopedDeptIds: [
      reqUser.deptId,
      ...subDepartmentUnits.map((department) => department.id)
    ].filter(Boolean)
  };
};

const getTaskScope = async (task) => {
  const assignee = task.assignee || await User.findOne({
    where: { uid: task.assignedTo },
    include: [{ model: Department, as: 'department' }]
  });

  return { assignee, department: assignee?.department || null };
};

const canManageTaskEscalation = (reqUser, department, assignee) => {
  const role = reqUser.role?.toLowerCase()?.trim() || '';
  const globalRoles = ['organization admin', 'ceo', 'system-admin'];
  if (globalRoles.includes(role)) return true;
  if (!department || !assignee) return false;

  return (
    department.adminId === reqUser.uid ||
    assignee.deptId === reqUser.deptId ||
    (reqUser.deptId && department.id === reqUser.deptId)
  );
};

const isDeptAdmin = (req, res, next) => {
  const role = normalizeInstitutionRoleName(req.user.role)?.toLowerCase()?.trim();
  const deptId = req.user.deptId || req.user.departmentId;
  const allowedRoles = [
    'dept-admin', 
    'Open School Admin', 'Online Admin', 'Skill Admin', 'BVoc Admin', 
    'Finance Admin', 'Sales Admin', 'HR Admin', 'Operations Admin', 'Academic Operations Admin',
    'Operations', 'Academic', 'Sales', 'Finance', 'HR',
    'Organization Admin', 'ceo', 'staff'
  ];

  const normalizedAllowed = allowedRoles.map(r => r.toLowerCase());
  
  if (!normalizedAllowed.includes(role)) {
    console.warn(`[AUTH] Unauthorized Role: ${role} for UID ${req.user.uid}`);
    return res.status(403).json({ error: `Access denied: Role ${role} not authorized for management.` });
  }

  // If no deptId, we only block if it's NOT one of the center-level roles that MUST have a deptId
  const centerRoles = ['open school admin', 'online admin', 'skill admin', 'bvoc admin'];
  if (centerRoles.includes(role) && !deptId) {
    return res.status(403).json({ error: 'Access denied: Unit ID missing for specialized role.' });
  }

  const inferredSubDept = centerRoles.includes(role)
    ? normalizeSubDepartmentName(normalizeInstitutionRoleName(req.user.role || '').replace(/\s+Admin$/i, '').trim())
    : null;
  const effectiveSubDept = normalizeSubDepartmentName(req.user.subDepartment || inferredSubDept || '');

  // Avoid mutating frozen req.user - Create local context for route consistency
  req.user = { 
    ...req.user, 
    deptId, 
    subDepartment: effectiveSubDept 
  };
  
  next();
};

// --- Team Management ---
router.get('/team', verifyToken, isDeptAdmin, async (req, res) => {
  try {
    const role = normalizeInstitutionRoleName(req.user.role)?.toLowerCase()?.trim();
    const globalRoles = ['organization admin', 'ceo', 'system-admin'];
    const unitRoles = ['bvoc admin', 'skill admin', 'online admin', 'open school admin'];

    if (globalRoles.includes(role)) {
      return res.status(403).json({
        error: 'Use the institutional roster endpoint for executive/global access.'
      });
    }

    if (!req.user.deptId) {
      return res.status(400).json({ error: 'Department scope missing' });
    }

    const queryWhere = {
      uid: { [Op.ne]: req.user.uid },
      [Op.and]: [
        sqlWhere(fn('lower', col('role')), 'employee')
      ]
    };

    // Strict unit isolation for specialized sub-department admins.
    if (unitRoles.includes(role)) {
      if (!req.user.subDepartment) {
        return res.status(400).json({ error: 'Sub-department scope missing for unit admin' });
      }
      const subDepartmentAliases = getSubDepartmentNameAliases(req.user.subDepartment);
      const subDepartmentUnits = await Department.findAll({
        attributes: ['id'],
        where: {
          name: {
            [Op.in]: subDepartmentAliases
          }
        }
      });
      const scopedDeptIds = [
        req.user.deptId,
        ...subDepartmentUnits.map((department) => department.id)
      ].filter(Boolean);

      queryWhere[Op.and].push({
        [Op.or]: [
          { reportingManagerUid: req.user.uid },
          {
            deptId: {
              [Op.in]: scopedDeptIds
            }
          },
          {
            subDepartment: {
              [Op.in]: subDepartmentAliases
            }
          }
        ]
      });
    } else {
      const scopedDeptIds = await resolveManagedDepartmentIds(req.user.deptId, role);
      queryWhere.deptId = scopedDeptIds.length === 1
        ? scopedDeptIds[0]
        : { [Op.in]: scopedDeptIds };
    }

    const teamRaw = await User.findAll({
      where: queryWhere,
      attributes: { exclude: ['password', 'devPassword'] },
      order: [['name', 'ASC']]
    });

    const now = new Date();
    const agedThreshold = new Date(now.getTime() - (48 * 60 * 60 * 1000));

    const team = await Promise.all(teamRaw.map(async (user) => {
      const overdueTasks = await Task.count({
        where: {
          assignedTo: user.uid,
          status: { [Op.ne]: 'completed' },
          deadline: { [Op.lt]: now }
        }
      });

      const agedPendingLeaves = await Leave.count({
        where: {
          employeeId: user.uid,
          status: { [Op.in]: ['pending admin', 'pending hr'] },
          createdAt: { [Op.lt]: agedThreshold }
        }
      });

      let leadsCaptured = 0;
      const roleLower = user.role?.toLowerCase() || '';
      if (roleLower.includes('sales') || roleLower.includes('crm') || roleLower.includes('bde')) {
        leadsCaptured = await Lead.count({
          where: { [Op.or]: [{ bdeId: user.uid }, { employeeId: user.uid }] }
        });
      }

      return {
        ...user.get({ plain: true }),
        performance: {
          overdueTasks,
          agedPendingLeaves,
          leadsCaptured
        }
      };
    }));

    res.json(team);
  } catch (error) {
    console.error('Fetch team error:', error);
    res.status(500).json({ error: 'Failed to fetch team members' });
  }
});

// --- Employee Onboarding/Enrollment ---
router.post('/team/onboard', verifyToken, isDeptAdmin, async (req, res) => {
  try {
    const userRole = req.user.role?.toLowerCase()?.trim();
    if (userRole !== 'hr admin' && userRole !== 'organization admin') {
      return res.status(403).json({ error: 'Governance Error: Employee enrollment is restricted to the Human Resources department.' });
    }
    const { email, password, name, subDepartment, role, reportingManagerUid } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: "Email, password, and name are required" });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: "User with this email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const generatedUid = `EMP-${Date.now().toString().slice(-6)}`;

    const newUser = await User.create({
      uid: generatedUid,
      email,
      password: hashedPassword,
      devPassword: password,
      role: role || 'Employee',
      name,
      deptId: req.user.deptId,
      subDepartment: subDepartment || req.user.subDepartment || 'General',
      reportingManagerUid: reportingManagerUid || req.user.uid,
      status: 'active', // Direct registration by Dept Admin is immediate
      devPassword: password
    });

    res.status(201).json(newUser);
  } catch (error) {
    console.error('Dept Admin Onboard Error:', error);
    res.status(500).json({ error: 'Failed to register employee' });
  }
});

router.put('/team/:uid/accept', verifyToken, isDeptAdmin, async (req, res) => {
  try {
    const { uid } = req.params;
    const user = await User.findOne({ where: { uid, deptId: req.user.deptId } });

    if (!user) {
        return res.status(404).json({ error: 'Employee not found in your department scope' });
    }

    if (user.status !== 'pending_dept') {
        return res.status(400).json({ error: `User is already ${user.status}` });
    }

    await user.update({ status: 'active' });
    res.json({ message: 'Employee successfully enrolled and activated.', user });
  } catch (error) {
    console.error('Accept employee error:', error);
    res.status(500).json({ error: 'Failed to accept employee' });
  }
});

router.put('/team/:uid/status', verifyToken, isDeptAdmin, async (req, res) => {
  try {
    const { uid } = req.params;
    const { status } = req.body;

    const queryWhere = { uid };
    if (req.user.deptId) {
      queryWhere.deptId = req.user.deptId;
    }

    const user = await User.findOne({ where: queryWhere });
    if (!user) {
      return res.status(404).json({ error: 'Personnel not found in your department scope' });
    }

    // Toggle between active and inactive
    const newStatus = status === 'active' ? 'active' : 'inactive';
    await user.update({ status: newStatus });
    
    res.json({ message: `Personnel status updated to ${newStatus}`, status: newStatus });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ error: 'Failed to update personnel status' });
  }
});

// --- Tasks Management ---
import { augmentTaskCollection } from '../utils/taskAugmentation.js';

router.get('/tasks', verifyToken, isDeptAdmin, async (req, res) => {
  const { departmentId, subDepartmentId } = req.query;
  const role = req.user.role?.toLowerCase()?.trim();
  const globalRoles = ['organization admin', 'operations admin', 'academic operations admin', 'operations', 'academic', 'finance admin', 'finance', 'hr admin', 'hr', 'sales admin', 'sales', 'ceo', 'system-admin'];

  // Oversight Policy: departmentId is mandatory for department roles but optional for executives.
  if (!departmentId && !globalRoles.includes(role)) {
    return res.status(400).json({ 
        message: "departmentId is required for departmental task oversight.",
        module: "DEPT_ADMIN"
    });
  }

  try {
    // Oversight Query: Filter by departmentId only if provided (execs might skip for total view)
    const whereClause = {
        [Op.or]: [
            {
                ...(departmentId && { departmentId }),
                ...(subDepartmentId && { subDepartmentId })
            },
            { assignedTo: req.user.uid }
        ]
    };

    const tasksRaw = await Task.findAll({
      where: whereClause,
      include: [
        { 
            model: User, 
            as: 'assignee', 
            attributes: ['uid', 'name', 'email'],
            required: false 
        }
      ],
      order: [['deadline', 'ASC']]
    });

    const tasks = augmentTaskCollection(tasksRaw);
    return res.json(tasks);

  } catch (error) {
    // Step 6: Error Handling
    console.error("DEPT TASK ERROR:", error);
    return res.status(500).json({ 
        message: "Failed to load tasks", 
        module: "DEPT_ADMIN" 
    });
  }
});


router.post('/tasks', verifyToken, isDeptAdmin, async (req, res) => {
  try {
    let { assignedTo, title, deadline, priority, departmentId, subDepartmentId } = req.body;
    // 1. Resolve target user's context for RBAC enforcement
    let targetUser = await User.findOne({ where: { uid: assignedTo } });

    // Fallback: If 'HR-SYSTEM' flag was provided (or exact match failed), dynamically heal mapping
    if (!targetUser && String(assignedTo).startsWith('HR-')) {
       targetUser = await User.findOne({ 
          where: { 
             [Op.or]: [
               { role: 'HR Admin' },
               sqlWhere(fn('lower', col('role')), 'hr admin'),
               sqlWhere(fn('lower', col('role')), 'human resources')
             ]
          } 
       });
       if (targetUser) {
           assignedTo = targetUser.uid; // Heal the payload
       }
    }

    if (!targetUser) return res.status(404).json({ error: 'Assignee not found' });

    try {
      // [RBAC] Centralized Governance Enforcement
      validateTaskAssignment(req.user, targetUser);
    } catch (rbacError) {
      console.error(`[RBAC-VIOLATION] UID ${req.user.uid} attempted invalid assignment to ${assignedTo}: ${rbacError.message}`);
      return res.status(403).json({ 
        error: "Invalid task assignment: role hierarchy violation",
        details: rbacError.message,
        module: "DEPT_ADMIN"
      });
    }

    // Step 10: Automatic Context Resolution
    // If the creator doesn't specify a department (e.g., CEO), fallback to the target's department
    if (!departmentId && targetUser) departmentId = targetUser.deptId;
    
    // Ensure subDepartmentId is a valid integer if provided or falling back
    // targetUser.subDepartment is often a string label (e.g. "Operations"), so we only use it if numeric
    if (!subDepartmentId && targetUser && !isNaN(parseInt(targetUser.subDepartment))) {
        subDepartmentId = parseInt(targetUser.subDepartment);
    } else if (subDepartmentId && isNaN(parseInt(subDepartmentId))) {
        subDepartmentId = null; // Prevent non-integer strings from crashing the DB
    }

    const task = await Task.create({
      assignedTo,
      assignedBy: req.user.uid,
      title,
      deadline,
      priority: priority || 'medium',
      status: 'pending',
      departmentId,
      subDepartmentId
    }, { context: { assigner: req.user } });

    // GAP-2: Real-Time & Persistent Notification
    const isCEO = req.user.role?.toLowerCase()?.trim() === 'ceo';
    await createNotification(req.io, {
      targetUid: assignedTo,
      title: 'New Institutional Directive',
      message: `New task: ${title}. High-priority delivery expected.`,
      type: 'info',
      link: isCEO ? '/dashboard/hr/dept-tasks' : '/dashboard/tasks'
    });

    res.status(201).json(task);
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

router.put('/tasks/:id', verifyToken, isDeptAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, deadline, priority, status, remarks } = req.body;

    const task = await Task.findOne({ where: { id, assignedBy: req.user.uid } });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    if (status && status !== task.status && !remarks?.trim()) {
      return res.status(400).json({ error: 'Remarks are required when changing task status' });
    }

    await task.update({ title, deadline, priority, status, ...(remarks ? { remarks } : {}) });
    res.json(task);
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

router.put('/tasks/:id/grace', verifyToken, isDeptAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const task = await Task.findByPk(id, {
      include: [{ model: User, as: 'assignee', include: [{ model: Department, as: 'department' }] }]
    });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const { assignee, department } = await getTaskScope(task);
    if (!canManageTaskEscalation(req.user, department, assignee)) {
      return res.status(403).json({ error: 'You can only manage escalation for tasks in your department scope' });
    }
    if (task.status === 'completed') {
      return res.status(400).json({ error: 'Completed tasks cannot be placed into grace review' });
    }

    const graceUntil = new Date(Date.now() + DEPT_GRACE_HOURS * 60 * 60 * 1000);
    await task.update({
      escalationLevel: 'DEPT_ADMIN',
      deptAdminDecision: 'GRACE_GRANTED',
      deptAdminNotifiedAt: task.deptAdminNotifiedAt || new Date(),
      deptAdminGraceUntil: graceUntil,
      remarks: `Department Admin granted a 24-hour grace period until ${graceUntil.toISOString()}.`
    });

    await AuditLog.create({
      userId: req.user.uid,
      action: 'TASK_GRACE_GRANTED',
      entity: 'Task',
      module: 'DEPT_ADMIN',
      after: { taskId: task.id, deptAdminGraceUntil: graceUntil },
      timestamp: new Date()
    });

    res.json({ message: '24-hour grace period granted', task });
  } catch (error) {
    console.error('Grant task grace error:', error);
    res.status(500).json({ error: 'Failed to grant task grace period' });
  }
});

router.put('/tasks/:id/escalate', verifyToken, isDeptAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const task = await Task.findByPk(id, {
      include: [{ model: User, as: 'assignee', include: [{ model: Department, as: 'department' }] }]
    });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const { assignee, department } = await getTaskScope(task);
    if (!canManageTaskEscalation(req.user, department, assignee)) {
      return res.status(403).json({ error: 'You can only escalate tasks in your department scope' });
    }
    if (task.status === 'completed') {
      return res.status(400).json({ error: 'Completed tasks cannot be escalated' });
    }

    await task.update({
      escalationLevel: 'CEO',
      deptAdminDecision: 'ESCALATED_TO_CEO',
      deptAdminNotifiedAt: task.deptAdminNotifiedAt || new Date(),
      deptAdminGraceUntil: null,
      escalatedAt: new Date(),
      remarks: 'Department Admin manually escalated this overdue task to the CEO.'
    });

    await AuditLog.create({
      userId: req.user.uid,
      action: 'TASK_ESCALATED_TO_CEO',
      entity: 'Task',
      module: 'DEPT_ADMIN',
      after: { taskId: task.id },
      timestamp: new Date()
    });

    await createNotification(req.io, {
      targetUid: task.assignedTo,
      title: 'Task Escalated',
      message: `Your overdue task "${task.title}" has been escalated to the CEO by the Department Admin.`,
      type: 'warning',
      link: '/dashboard/tasks'
    });

    const allCeoPanels = await CEOPanel.findAll({ where: { status: 'Active' } });
    const deptName = department?.name || assignee?.department?.name || 'General';
    const targetingCeos = allCeoPanels.filter(panel =>
      panel.visibilityScope && Array.isArray(panel.visibilityScope) && panel.visibilityScope.includes(deptName)
    );

    if (targetingCeos.length > 0) {
      for (const panel of targetingCeos) {
        await Notification.create({
          userUid: panel.userId,
          type: 'error',
          message: `CRITICAL ESCALATION [${deptName}]: Task "${task.title}" was escalated directly by the Department Admin.`,
          link: '/dashboard/ceo/escalations'
        });
      }
    }

    res.json({ message: 'Task escalated to CEO', task });
  } catch (error) {
    console.error('Escalate task to CEO error:', error);
    res.status(500).json({ error: 'Failed to escalate task to CEO' });
  }
});

router.delete('/tasks/:id', verifyToken, isDeptAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const task = await Task.findOne({ where: { id, assignedBy: req.user.uid } });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    await task.destroy();
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// --- Leave Approvals (Step-1) ---
router.get('/leaves', verifyToken, isDeptAdmin, async (req, res) => {
  try {
    const role = normalizeInstitutionRoleName(req.user.role)?.toLowerCase()?.trim();
    const globalRoles = ['organization admin', 'ceo', 'system-admin'];
    const unitRoles = ['bvoc admin', 'skill admin', 'online admin', 'open school admin'];

    if (globalRoles.includes(role)) {
      return res.status(403).json({
        error: 'Use the institutional or HR leave views for executive/global access.'
      });
    }

    if (!req.user.deptId) {
      return res.status(400).json({ error: 'Department scope missing' });
    }

    const scopedDeptIds = await resolveManagedDepartmentIds(req.user.deptId, role);
    const employeeWhere = {
      deptId: scopedDeptIds.length === 1
        ? scopedDeptIds[0]
        : { [Op.in]: scopedDeptIds }
    };

    if (unitRoles.includes(role)) {
      if (!req.user.subDepartment) {
        return res.status(400).json({ error: 'Sub-department scope missing for unit admin' });
      }
      const { scopedDeptIds: unitScopedDeptIds, subDepartmentAliases } = await resolveUnitScope(req.user);
      employeeWhere[Op.or] = [
        {
          deptId: unitScopedDeptIds.length === 1
            ? unitScopedDeptIds[0]
            : { [Op.in]: unitScopedDeptIds }
        },
        {
          subDepartment: {
            [Op.in]: subDepartmentAliases
          }
        }
      ];
      delete employeeWhere.deptId;
    }

    const leaves = await Leave.findAll({
      include: [
        { 
          model: User, 
          as: 'employee', 
          attributes: ['uid', 'name', 'email', 'deptId', 'subDepartment'],
          include: [{ model: Department, as: 'department', attributes: ['name'] }],
          where: employeeWhere 
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(leaves);
  } catch (error) {
    console.error('Fetch team leaves error:', error);
    res.status(500).json({ error: 'Failed to fetch team leaves' });
  }
});

router.put('/leaves/:id/approve', verifyToken, isDeptAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const role = normalizeInstitutionRoleName(req.user.role)?.toLowerCase()?.trim();
    const unitRoles = ['bvoc admin', 'skill admin', 'online admin', 'open school admin'];
    const leave = await Leave.findByPk(id, {
      include: [{ model: User, as: 'employee' }]
    });

    if (!leave) return res.status(404).json({ error: 'Leave request not found' });
    const scopedDeptIds = await resolveManagedDepartmentIds(req.user.deptId, role);
    if (!scopedDeptIds.includes(leave.employee.deptId)) {
      return res.status(403).json({ error: 'You can only approve leaves for your department' });
    }
    if (unitRoles.includes(role)) {
      const { scopedDeptIds: unitScopedDeptIds, subDepartmentAliases } = await resolveUnitScope(req.user);
      const matchesScopedDept = unitScopedDeptIds.includes(leave.employee.deptId);
      const matchesSubDepartment = subDepartmentAliases.includes(leave.employee.subDepartment);

      if (!matchesScopedDept && !matchesSubDepartment) {
        return res.status(403).json({ error: 'You can only approve leaves for your sub-department' });
      }
    }
    if (!STEP_1_PENDING_STATUSES.includes(leave.status)) {
      return res.status(400).json({ error: `Cannot Step-1 approve in current status: ${leave.status}` });
    }

    await leave.update({
      status: 'pending hr',
      step1By: req.user.uid
    });

    const hrUsers = await User.findAll({
      where: { role: 'HR Admin', status: 'active' },
      attributes: ['uid']
    });

    for (const hr of hrUsers) {
      await createNotification(req.io, {
        targetUid: hr.uid,
        title: 'Leave Request Ready For Step-2',
        message: `${leave.employee?.name || leave.employeeId} has a ${leave.type} request awaiting HR approval (${leave.fromDate} to ${leave.toDate}).`,
        type: 'info',
        link: '/dashboard/hr/leaves'
      });
    }
    
    // Notify employee of Step 1 approval (Persistent Alert)
    await createNotification(req.io, {
      targetUid: leave.employeeId,
      title: 'Leave Update (Step-1)',
      message: `Your leave request for ${leave.type} (${leave.fromDate} to ${leave.toDate}) was Step-1 APPROVED by your Department Head and forwarded to HR.`,
      type: 'success',
      link: '/dashboard/employee/leaves'
    });
    
    res.json(leave);
  } catch (error) {
    console.error('Approve team leave error:', error);
    res.status(500).json({ error: 'Failed to approve team leave' });
  }
});

router.put('/leaves/:id/reject', verifyToken, isDeptAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const role = normalizeInstitutionRoleName(req.user.role)?.toLowerCase()?.trim();
    const unitRoles = ['bvoc admin', 'skill admin', 'online admin', 'open school admin'];
    const leave = await Leave.findByPk(id, {
      include: [{ model: User, as: 'employee' }]
    });

    if (!leave) return res.status(404).json({ error: 'Leave request not found' });
    const scopedDeptIds = await resolveManagedDepartmentIds(req.user.deptId, role);
    if (!scopedDeptIds.includes(leave.employee.deptId)) {
      return res.status(403).json({ error: 'You can only reject leaves for your department' });
    }
    if (unitRoles.includes(role)) {
      const { scopedDeptIds: unitScopedDeptIds, subDepartmentAliases } = await resolveUnitScope(req.user);
      const matchesScopedDept = unitScopedDeptIds.includes(leave.employee.deptId);
      const matchesSubDepartment = subDepartmentAliases.includes(leave.employee.subDepartment);

      if (!matchesScopedDept && !matchesSubDepartment) {
        return res.status(403).json({ error: 'You can only reject leaves for your sub-department' });
      }
    }
    if (!STEP_1_PENDING_STATUSES.includes(leave.status)) {
      return res.status(400).json({ error: `Cannot Step-1 reject in current status: ${leave.status}` });
    }

    await leave.update({
      status: 'rejected',
      step1By: req.user.uid
    });
    
    // Notify employee of Step 1 rejection (Persistent Alert)
    await createNotification(req.io, {
      targetUid: leave.employeeId,
      title: 'Leave Rejected (Step-1)',
      message: `Your leave request for ${leave.type} was rejected by your Department Head.`,
      type: 'error',
      link: '/dashboard/employee/leaves'
    });

    res.json(leave);
  } catch (error) {
    console.error('Reject team leave error:', error);
    res.status(500).json({ error: 'Failed to reject team leave' });
  }
});

// Seed endpoint mapping for test simulation (since Employee portal isn't built yet)
router.post('/leaves/test-create', verifyToken, isDeptAdmin, async (req, res) => {
  try {
    const { employeeId, type, fromDate, toDate } = req.body;
    // Ensure the employee belongs to this dept
    const emp = await User.findOne({ where: { uid: employeeId, deptId: req.user.deptId } });
    if (!emp) return res.status(400).json({ error: 'Invalid team employee for test' });

    // Create as pending admin so dept-admin can act on it
    const leave = await Leave.create({
      employeeId,
      type,
      fromDate,
      toDate,
      status: 'pending admin'
    });
    
    res.status(201).json(leave);
  } catch (error) {
    console.error('Create test leave error:', error);
    res.status(500).json({ error: 'Failed to create test leave' });
  }
});

export default router;
