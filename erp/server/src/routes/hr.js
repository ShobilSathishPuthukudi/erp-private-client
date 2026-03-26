import express from 'express';
import bcrypt from 'bcryptjs';
import { models } from '../models/index.js';
import { verifyToken } from '../middleware/verifyToken.js';
import validate from '../middleware/validate.js';
import { employeeSchema } from '../lib/schemas.js';
import { logAction } from '../lib/audit.js';

const router = express.Router();
const { User, Leave, Department, Announcement } = models;

const isHR = (req, res, next) => {
  if (!['hr', 'org-admin', 'system-admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied: Insufficient privileges' });
  }
  next();
};

// --- Employee Management ---

router.get('/employees', verifyToken, isHR, async (req, res) => {
  try {
    const employees = await User.findAll({
      where: { role: 'employee' },
      attributes: { exclude: ['password'] },
      include: [{ model: Department, as: 'department', attributes: ['id', 'name'] }],
      order: [['createdAt', 'DESC']]
    });
    res.json(employees);
  } catch (error) {
    console.error('Fetch employees error:', error);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

router.post('/employees', verifyToken, isHR, validate(employeeSchema), async (req, res) => {
  try {
    const { email, password, name, status, deptId } = req.body;
    
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const generatedUid = `EMP-${Date.now().toString().slice(-6)}`;

    const newUser = await User.create({
      uid: generatedUid, 
      email, 
      password: hashedPassword, 
      role: 'employee', 
      name, 
      status: status || 'active', 
      deptId: deptId || null
    });

    await logAction({
       userId: req.user.uid,
       action: 'CREATE',
       entity: 'Employee',
       details: `Registered new employee: ${newUser.name} (${newUser.email})`,
       module: 'HR'
    });

    const userObj = newUser.toJSON();
    delete userObj.password;
    res.status(201).json(userObj);
  } catch (error) {
    console.error('Create employee error:', error);
    res.status(500).json({ error: 'Failed to create employee' });
  }
});

router.put('/employees/:uid', verifyToken, isHR, async (req, res) => {
  try {
    const { uid } = req.params;
    const { email, password, name, status, deptId } = req.body;

    const user = await User.findOne({ where: { uid, role: 'employee' } });
    if (!user) return res.status(404).json({ error: 'Employee not found' });

    if (email !== user.email) {
      const existing = await User.findOne({ where: { email } });
      if (existing) {
        return res.status(400).json({ error: 'Email already taken by another user' });
      }
    }

    const updates = { email, name, status, deptId: deptId || null };
    if (password && password.trim() !== '') {
      updates.password = await bcrypt.hash(password, 10);
    }

    await user.update(updates);
    
    const userObj = user.toJSON();
    delete userObj.password;
    res.json(userObj);
  } catch (error) {
    console.error('Update employee error:', error);
    res.status(500).json({ error: 'Failed to update employee' });
  }
});

router.delete('/employees/:uid', verifyToken, isHR, async (req, res) => {
  try {
    const { uid } = req.params;
    const user = await User.findOne({ where: { uid, role: 'employee' } });
    if (!user) return res.status(404).json({ error: 'Employee not found' });
    
    await user.destroy();
    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({ error: 'Failed to delete employee' });
  }
});

// --- Leave Approvals ---

router.get('/leaves', verifyToken, isHR, async (req, res) => {
  try {
    const leaves = await Leave.findAll({
      include: [
        { model: User, as: 'employee', attributes: ['uid', 'name', 'email'] },
        { model: User, as: 'step1Approver', attributes: ['uid', 'name'] },
        { model: User, as: 'step2Approver', attributes: ['uid', 'name'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(leaves);
  } catch (error) {
    console.error('Fetch leaves error:', error);
    res.status(500).json({ error: 'Failed to fetch leaves' });
  }
});

router.put('/leaves/:id/approve', verifyToken, isHR, async (req, res) => {
  try {
    const { id } = req.params;
    const leave = await Leave.findByPk(id);
    
    if (!leave) return res.status(404).json({ error: 'Leave request not found' });
    if (leave.status !== 'pending_step2') {
      return res.status(400).json({ error: `Cannot approve in current status: ${leave.status}` });
    }

    await logAction({
       userId: req.user.uid,
       action: 'UPDATE',
       entity: 'Leave',
       details: `Approved leave request for employee ${leave.employeeId}`,
       module: 'HR'
    });
    
    // Notify employee of Final Approval
    if (req.io) {
      req.io.emit('notification', {
        targetUid: leave.employeeId,
        title: 'Leave Approved',
        message: `Your leave request to ${new Date(leave.toDate).toLocaleDateString()} was officially Approved by HR.`,
        type: 'success'
      });
    }
    
    res.json(leave);
  } catch (error) {
    console.error('Approve leave error:', error);
    res.status(500).json({ error: 'Failed to approve leave' });
  }
});

router.put('/leaves/:id/reject', verifyToken, isHR, async (req, res) => {
  try {
    const { id } = req.params;
    const leave = await Leave.findByPk(id);
    
    if (!leave) return res.status(404).json({ error: 'Leave request not found' });
    if (leave.status !== 'pending_step2') {
      return res.status(400).json({ error: `Cannot reject in current status: ${leave.status}` });
    }

    await leave.update({
      status: 'rejected_step2',
      step2By: req.user.uid
    });

    await logAction({
       userId: req.user.uid,
       action: 'UPDATE',
       entity: 'Leave',
       details: `Rejected leave request for employee ${leave.employeeId}`,
       module: 'HR'
    });
    
    res.json(leave);
  } catch (error) {
    console.error('Reject leave error:', error);
    res.status(500).json({ error: 'Failed to reject leave' });
  }
});

// Temporary endpoint to create a dummy leave for testing (since Employee portal isn't built yet)
router.post('/leaves/test-create', verifyToken, isHR, async (req, res) => {
  try {
    const { employeeId, type, fromDate, toDate } = req.body;
    
    // Create it as pending_step2 directly so HR can approve it in this phase
    const leave = await Leave.create({
      employeeId,
      type,
      fromDate,
      toDate,
      status: 'pending_step2'
    });
    
    res.status(201).json(leave);
  } catch (error) {
    console.error('Create test leave error:', error);
    res.status(500).json({ error: 'Failed to create test leave' });
  }
});

// ==========================================
// 6. GLOBAL ANNOUNCEMENTS
// ==========================================

// Get all announcements
router.get('/announcements', verifyToken, async (req, res) => {
  try {
    const announcements = await Announcement.findAll({
      include: [{ model: User, as: 'author', attributes: ['name', 'role'] }],
      order: [['createdAt', 'DESC']]
    });
    res.json(announcements);
  } catch (error) {
    console.error('Fetch Announcements Error:', error);
    res.status(500).json({ error: 'Failed to fetch global announcements' });
  }
});

// Create a new announcement (HR and Admins only)
router.post('/announcements', verifyToken, isHR, async (req, res) => {
  try {
    const { title, message, priority } = req.body;
    
    await logAction({
       userId: req.user.uid,
       action: 'CREATE',
       entity: 'Announcement',
       details: `Broadcast: ${announcement.title}`,
       module: 'HR'
    });

    // Broadcast conceptually across sockets
    if (req.io) {
      req.io.emit('global_announcement', {
        title: `HR Announcement: ${title}`,
        message: 'A new company-wide announcement has been posted.',
        priority,
        author: req.user.name
      });
    }

    res.status(201).json(announcement);
  } catch (error) {
    console.error('Create Announcement Error:', error);
    res.status(500).json({ error: 'Failed to broadcast announcement' });
  }
});

export default router;
