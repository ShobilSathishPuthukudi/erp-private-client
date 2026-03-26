import express from 'express';
import { models } from '../models/index.js';
import { verifyToken } from '../middleware/verifyToken.js';
import { Op } from 'sequelize';

const router = express.Router();
const { User, Task, Leave, Department } = models;

const isDeptAdmin = (req, res, next) => {
  const role = req.user.role?.toLowerCase();
  const deptId = req.user.deptId || req.user.departmentId;
  const allowedRoles = ['dept-admin', 'dept_admin', 'openschool', 'online', 'skill', 'bvoc'];
  
  if (!allowedRoles.includes(role) || !deptId) {
    return res.status(403).json({ error: 'Access denied: Must be a Department Admin or Sub-department admin with an assigned department' });
  }
  
  // Normalize deptId for subsequent handlers
  req.user.deptId = deptId;
  next();
};

// --- Team Management ---
router.get('/team', verifyToken, isDeptAdmin, async (req, res) => {
  try {
    const team = await User.findAll({
      where: { 
        deptId: req.user.deptId,
        role: 'employee' 
      },
      attributes: { exclude: ['password'] }
    });
    res.json(team);
  } catch (error) {
    console.error('Fetch team error:', error);
    res.status(500).json({ error: 'Failed to fetch team members' });
  }
});

// --- Tasks Management ---
router.get('/tasks', verifyToken, isDeptAdmin, async (req, res) => {
  try {
    const tasks = await Task.findAll({
      where: { assignedBy: req.user.uid },
      include: [
        { model: User, as: 'assignee', attributes: ['uid', 'name', 'email'] }
      ],
      order: [['deadline', 'ASC']]
    });
    res.json(tasks);
  } catch (error) {
    console.error('Fetch tasks error:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

router.post('/tasks', verifyToken, isDeptAdmin, async (req, res) => {
  try {
    const { assignedTo, title, deadline, priority } = req.body;
    
    // Verify assignee is in the admin's department
    const assignee = await User.findOne({ where: { uid: assignedTo, deptId: req.user.deptId } });
    if (!assignee) {
      return res.status(400).json({ error: 'Assignee must be a member of your department' });
    }

    const task = await Task.create({
      assignedTo,
      assignedBy: req.user.uid,
      title,
      deadline,
      priority: priority || 'medium',
      status: 'pending'
    });

    // GAP-2: Real-Time Event Processing
    if (req.io) {
      req.io.emit('notification', {
        targetUid: assignedTo,
        title: 'New Task Assigned',
        message: `You have been assigned: ${title}`,
        type: 'info'
      });
    }

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
