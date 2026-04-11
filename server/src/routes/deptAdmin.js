import express from 'express';
import bcrypt from 'bcryptjs';
import { models } from '../models/index.js';
import { verifyToken } from '../middleware/verifyToken.js';
import { Op } from 'sequelize';
import { createNotification } from './notifications.js';
import { validateTaskAssignment } from '../utils/rbac/validateTaskAssignment.js';

const router = express.Router();
const { User, Task, Leave, Department } = models;

const isDeptAdmin = (req, res, next) => {
  const role = req.user.role?.toLowerCase()?.trim();
  const deptId = req.user.deptId || req.user.departmentId;
  const allowedRoles = [
    'dept-admin', 
    'Open School Admin', 'Online Department Admin', 'Skill Department Admin', 'BVoc Department Admin', 
    'Finance Admin', 'Sales & CRM Admin', 'HR Admin', 'Operations Admin', 'Academic Operations Admin',
    'Operations', 'Academic', 'Sales', 'Finance', 'HR',
    'Organization Admin', 'ceo', 'staff'
  ];

  const normalizedAllowed = allowedRoles.map(r => r.toLowerCase());
  
  if (!normalizedAllowed.includes(role)) {
    console.warn(`[AUTH] Unauthorized Role: ${role} for UID ${req.user.uid}`);
    return res.status(403).json({ error: `Access denied: Role ${role} not authorized for management.` });
  }

  // If no deptId, we only block if it's NOT one of the center-level roles that MUST have a deptId
  const centerRoles = ['open school admin', 'online department admin', 'skill department admin', 'bvoc department admin'];
  if (centerRoles.includes(role) && !deptId) {
    return res.status(403).json({ error: 'Access denied: Unit ID missing for specialized role.' });
  }

  const effectiveSubDept = req.user.subDepartment || (centerRoles.includes(role) ? role.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : null);

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
    const role = req.user.role?.toLowerCase()?.trim();
    const queryWhere = {};
    
    // Oversight Policy: Only filter by deptId if the user is a departmental role
    // Global roles continue to have institutional oversight.
    const globalRoles = ['organization admin', 'ceo', 'system-admin'];
    
    const isHRDept = parseInt(req.user.deptId) === 35;
    
    // EXCLUSION POLICY: Do not include the current administrator or institutional roles as "team members"
    queryWhere.uid = { [Op.ne]: req.user.uid };
    
    // [GOVERNANCE] Contextual Roster Visibility:
    // HR Department (ID 35) shows all departmental roles (Admins + Employees).
    // All other departments strictly display their 'Employee' personnel roster.
    if (isHRDept) {
        queryWhere.role = { [Op.notIn]: ['organization admin', 'ceo', 'system-admin'] };
    } else {
        queryWhere.role = 'Employee';
    }

    // Narrow Scope for Operations: See specified departments only (Executive Oversight)
    const isOpsOversight = role.includes('operations') || role.includes('academic');
    if (isOpsOversight) {
      const targetRoles = [
        'Employee', 
        'dept-admin',
        'operations admin', 
        'academic operations admin', 
        'bvoc department admin', 
        'skill department admin', 
        'online department admin', 
        'open school admin'
      ];
      queryWhere.role = { [Op.in]: targetRoles };
    } else if (req.user.deptId && !globalRoles.includes(role)) {
      // Standard Departmental Isolation (Applies to HR Admin, Finance Admin, etc.)
      queryWhere.deptId = req.user.deptId;
      
      // Specialized Unit Isolation (BVoc, Skill, etc.)
      const unitRoles = ['bvoc department admin', 'skill department admin', 'online department admin', 'open school admin'];
      if (unitRoles.includes(role)) {
          // [FIX] Institutional Visibility Hardening:
          // Ensure the Admin can see all users in their deptId, but prioritize subDepartment matches.
          // We include users with NULL subDepartment or 'General' to prevent registration leakage.
          queryWhere[Op.or] = [
              { subDepartment: req.user.subDepartment },
              { subDepartment: 'General' },
              { subDepartment: null },
              { role: 'Employee' } // Force employee-only visibility for specialized units too
          ];
      }
    }

    const teamRaw = await User.findAll({
      where: queryWhere,
      attributes: { exclude: ['password'] },
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
      role: role || 'employee',
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
router.get('/tasks', verifyToken, isDeptAdmin, async (req, res) => {
  const { departmentId, subDepartmentId } = req.query;
  const globalRoles = ['organization admin', 'operations admin', 'Academic Operations Admin', 'operations', 'academic', 'finance admin', 'finance', 'hr admin', 'hr', 'sales & crm admin', 'sales', 'ceo', 'system-admin'];

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

    const now = new Date();
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

    const tasks = tasksRaw.map(t => {
      const task = t.toJSON();
      const deadlineDate = new Date(task.deadline);
      const isOverdue = deadlineDate < now && task.status !== 'completed';
      
      // Grace Period Logic: 24 Hours after deadline
      const gracePeriodThreshold = new Date(deadlineDate.getTime() + (24 * 60 * 60 * 1000));
      const isEscalated = now > gracePeriodThreshold && task.status !== 'completed';

      return {
        ...task,
        isOverdue,
        isEscalated,
        overdueLabel: isEscalated ? 'CRITICAL: ESCALATED TO CEO' : (isOverdue ? 'Overdue - Dept Admin Action Required' : null)
      };
    });

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
    const targetUser = await User.findOne({ where: { uid: assignedTo } });
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
    await createNotification(req.io, {
      targetUid: assignedTo,
      title: 'New Institutional Directive',
      message: `New task: ${title}. High-priority delivery expected.`,
      type: 'info',
      link: '/dashboard/tasks'
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
    const { title, deadline, priority, status } = req.body;

    const task = await Task.findOne({ where: { id, assignedBy: req.user.uid } });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    await task.update({ title, deadline, priority, status });
    res.json(task);
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Failed to update task' });
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
    const role = req.user.role?.toLowerCase()?.trim();
    const globalRoles = ['organization admin', 'operations admin', 'Academic Operations Admin', 'operations', 'academic', 'finance admin', 'finance', 'hr admin', 'hr', 'sales & crm admin', 'sales', 'ceo', 'system-admin'];
    const isGlobal = globalRoles.includes(role);

    // Oversight Policy: Global admins see all leaves, departmental admins see only their own.
    const employeeWhere = isGlobal ? {} : { deptId: req.user.deptId };

    const leaves = await Leave.findAll({
      include: [
        { 
          model: User, 
          as: 'employee', 
          attributes: ['uid', 'name', 'email', 'deptId'],
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
    const leave = await Leave.findByPk(id, {
      include: [{ model: User, as: 'employee' }]
    });

    if (!leave) return res.status(404).json({ error: 'Leave request not found' });
    if (leave.employee.deptId !== req.user.deptId) {
      return res.status(403).json({ error: 'You can only approve leaves for your department' });
    }
    if (leave.status !== 'pending admin') {
      return res.status(400).json({ error: `Cannot Step-1 approve in current status: ${leave.status}` });
    }

    await leave.update({
      status: 'pending hr',
      step1By: req.user.uid
    });
    
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
    const leave = await Leave.findByPk(id, {
      include: [{ model: User, as: 'employee' }]
    });

    if (!leave) return res.status(404).json({ error: 'Leave request not found' });
    if (leave.employee.deptId !== req.user.deptId) {
      return res.status(403).json({ error: 'You can only reject leaves for your department' });
    }
    if (leave.status !== 'pending admin') {
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
