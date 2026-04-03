import express from 'express';
import bcrypt from 'bcryptjs';
import { models } from '../models/index.js';
import { verifyToken } from '../middleware/verifyToken.js';

const router = express.Router();
const { User, Department } = models;

const isOrgAdmin = (req, res, next) => {
  const role = req.user.role?.toLowerCase()?.trim();
  const allowed = ['organization admin', 'org-admin', 'system-admin'];
  if (!allowed.includes(role)) {
    return res.status(403).json({ error: 'Access denied: Org Admin privileges required' });
  }
  next();
};

router.get('/', verifyToken, isOrgAdmin, async (req, res) => {
  try {
    const { role } = req.query;
    const whereClause = role ? { role } : {};
    
    const users = await User.findAll({
      where: whereClause,
      attributes: { exclude: ['password'] },
      include: [{ model: models.Role, as: 'RoleDetails', attributes: ['isAdminEligible'] }],
      order: [['createdAt', 'DESC']]
    });
    res.json(users);
  } catch (error) {
    console.error('Fetch users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.post('/', verifyToken, isOrgAdmin, async (req, res) => {
  try {
    const { email, password, role, name, status, deptId } = req.body;
    
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const generatedUid = `${role.toUpperCase().substring(0,3)}-${Date.now().toString().slice(-6)}`;

    // ENFORCE WORKFORCE CONTROL: No employee creation without vacancy
    const workforceRoles = ['employee', 'staff', 'faculty', 'bde', 'counselor'];
    if (workforceRoles.includes(role.toLowerCase()) && !req.body.vacancyId) {
      return res.status(400).json({ error: 'STRICT RULE: Employee creation requires an active vacancy. Please use the HR module.' });
    }

    const newUser = await User.create({
      uid: generatedUid, 
      email, 
      password: hashedPassword, 
      devPassword: password,
      role, 
      name, 
      status: status || 'active', 
      deptId: deptId || null,
      reportingManagerUid: req.body.reportingManagerUid || null,
      reporting_manager_id: req.body.reportingManagerUid || null,
      vacancyId: req.body.vacancyId || null
    });

    const userObj = newUser.toJSON();
    delete userObj.password;
    res.status(201).json(userObj);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

router.put('/:uid', verifyToken, isOrgAdmin, async (req, res) => {
  try {
    const { uid } = req.params;
    const { email, password, role, name, status, deptId } = req.body;

    const user = await User.findByPk(uid);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (email !== user.email) {
      const existing = await User.findOne({ where: { email } });
      if (existing) {
        return res.status(400).json({ error: 'Email already taken by another user' });
      }
    }

    const updates = { email, role, name, status, deptId: deptId || null };
    if (password && password.trim() !== '') {
      updates.password = await bcrypt.hash(password, 10);
      updates.devPassword = password;
    }

    await user.update(updates);
    
    const userObj = user.toJSON();
    delete userObj.password;
    res.json(userObj);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

router.delete('/:uid', verifyToken, isOrgAdmin, async (req, res) => {
  try {
    const { uid } = req.params;
    const user = await User.findByPk(uid);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    await user.destroy();
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;
