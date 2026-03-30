import express from 'express';
import bcrypt from 'bcryptjs';
import { models } from '../models/index.js';
import { verifyToken } from '../middleware/verifyToken.js';
import { Op } from 'sequelize';
import { createNotification } from './notifications.js';

const router = express.Router();
const { User, Task, Leave, Department } = models;

const isDeptAdmin = (req, res, next) => {
  const role = req.user.role?.toLowerCase();
  const deptId = req.user.deptId || req.user.departmentId;
  const allowedRoles = ['dept-admin', 'dept_admin', 'openschool', 'online', 'skill', 'bvoc', 'academic', 'finance', 'sales', 'hr', 'ops', 'operations', 'org-admin', 'system-admin'];

  if (!allowedRoles.includes(role)) {
    console.warn(`[AUTH] Unauthorized Role: ${role} for UID ${req.user.uid}`);
    return res.status(403).json({ error: `Access denied: Role ${role} not authorized for management.` });
  }

  // If no deptId, we only block if it's NOT one of the center-level roles that MUST have a deptId
  const centerRoles = ['openschool', 'online', 'skill', 'bvoc'];
  if (centerRoles.includes(role) && !deptId) {
    return res.status(403).json({ error: 'Access denied: Unit ID missing for specialized role.' });
  }

  req.user.deptId = deptId;
  next();
};

// --- Team Management ---
router.get('/team', verifyToken, isDeptAdmin, async (req, res) => {
  try {
    const role = req.user.role?.toLowerCase().trim();
    const queryWhere = {};
    
    // Isolation logic: Only filter by deptId if the user is a departmental role
    // Global roles (Academic, Operations, Org-Admin) see the full roster for institutional oversight.
    const globalRoles = ['academic', 'operations', 'org-admin', 'system-admin', 'ops', 'finance'];
    
    if (req.user.deptId && !globalRoles.includes(role)) {
      queryWhere.deptId = req.user.deptId;
    }

    const team = await User.findAll({
      where: queryWhere,
      attributes: { exclude: ['password'] },
      order: [['name', 'ASC']]
    });
    res.json(team);
  } catch (error) {
    console.error('Fetch team error:', error);
    res.status(500).json({ error: 'Failed to fetch team members' });
  }
});

// --- Employee Onboarding/Enrollment ---
router.post('/team/onboard', verifyToken, isDeptAdmin, async (req, res) => {
  try {
    const userRole = req.user.role?.toLowerCase();
    if (userRole !== 'hr' && userRole !== 'org-admin' && userRole !== 'system-admin') {
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
      role: role || 'employee',
      name,
      deptId: req.user.deptId,
      subDepartment: subDepartment || req.user.subDepartment || 'General',
      reportingManagerUid: reportingManagerUid || req.user.uid,
      status: 'active' // Direct registration by Dept Admin is immediate
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

  // Step 3: Backend Validation
  if (!departmentId) {
    return res.status(400).json({ 
        message: "departmentId is required",
        module: "DEPT_ADMIN"
    });
  }

  // Step 9: Logging
  console.log("Dept Tasks API:", { departmentId, subDepartmentId });

  try {
    // Step 4 & 5: Safe Query & Null-Safe Joins
    const whereClause = { 
        departmentId,
        // Step 1: Optional Sub-Department Filter
        ...(subDepartmentId && { subDepartmentId })
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
      const isOverdue = new Date(task.deadline) < now && task.status !== 'completed';
      return {
        ...task,
        isOverdue,
        overdueLabel: isOverdue ? 'Overdue - Employee Level' : null
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
    const { assignedTo, title, deadline, priority, departmentId, subDepartmentId } = req.body;
    
    // Verify assignee belongs to the department scope
    const assignee = await User.findOne({ where: { uid: assignedTo, deptId: departmentId } });
    if (!assignee) {
      return res.status(400).json({ error: 'Assignee must be a member of the target department scope' });
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
    });

    // GAP-2: Real-Time & Persistent Notification
    await createNotification(req.io, {
      targetUid: assignedTo,
      title: 'Institutional Directive Assigned',
      message: `New task: ${title}. High-priority delivery expected.`,
      type: 'info',
      link: '/dashboard/employee/tasks'
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
    // Find all leaves where the employee belongs to this deptAdmin's department
    const leaves = await Leave.findAll({
      include: [
        { 
          model: User, 
          as: 'employee', 
          attributes: ['uid', 'name', 'email'],
          where: { deptId: req.user.deptId } 
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
    if (leave.status !== 'pending_step1') {
      return res.status(400).json({ error: `Cannot Step-1 approve in current status: ${leave.status}` });
    }

    await leave.update({
      status: 'pending_step2',
      step1By: req.user.uid
    });
    
    // Notify employee of Step 1 approval
    if (req.io) {
      req.io.emit('notification', {
        targetUid: leave.employeeId,
        title: 'Leave Update',
        message: `Your leave request to ${new Date(leave.toDate).toLocaleDateString()} was Step-1 Approved`,
        type: 'success'
      });
    }
    
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
    if (leave.status !== 'pending_step1') {
      return res.status(400).json({ error: `Cannot Step-1 reject in current status: ${leave.status}` });
    }

    await leave.update({
      status: 'rejected_step1',
      step1By: req.user.uid
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

    // Create as pending_step1 so dept-admin can act on it
    const leave = await Leave.create({
      employeeId,
      type,
      fromDate,
      toDate,
      status: 'pending_step1'
    });
    
    res.status(201).json(leave);
  } catch (error) {
    console.error('Create test leave error:', error);
    res.status(500).json({ error: 'Failed to create test leave' });
  }
});

export default router;
