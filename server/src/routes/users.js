import express from 'express';
import bcrypt from 'bcryptjs';
import { models, sequelize } from '../models/index.js';
import { Op } from 'sequelize';
import { verifyToken } from '../middleware/verifyToken.js';

const COLLECTION_ROLES = [
  'CEO',
  'Employee',
  'student',
  'Partner Center',
  'study-center',
  'Sales & CRM Admin',
  'Sales',
  'HR Admin',
  'Finance Admin',
  'Operations Admin',
  'Academic Operations Admin',
  'Organization Admin'
];

/**
 * Institutional Governance: Authority Succession
 * Ensures that for singleton roles, only one active identity exists.
 * Any predecessor is automatically moved to 'suspended' state.
 */
const handleAuthoritySuccession = async (role, newUserId, transaction, adminUid = 'SYSTEM') => {
  if (COLLECTION_ROLES.includes(role)) return;

  const predecessors = await models.User.findAll({
    where: { role, status: 'active', uid: { [Op.ne]: newUserId } },
    transaction
  });

  if (predecessors.length > 0) {
    console.log(`[GOVERNANCE] Authority Succession triggered for ${role}. Suspending ${predecessors.length} predecessor(s).`);
    
    await models.User.update(
      { status: 'suspended' },
      { where: { role, status: 'active', uid: { [Op.ne]: newUserId } }, transaction }
    );

    // Audit the succession
    for (const p of predecessors) {
      await models.AuditLog.create({
        userId: adminUid,
        action: 'AUTHORITY_SUCCESSION',
        entity: `User: ${p.uid}`,
        module: 'GOVERNANCE',
        remarks: `Account suspended automatically as role '${role}' was assumed by UID: ${newUserId}`,
        timestamp: new Date()
      }, { transaction });
    }
  }
};

const router = express.Router();
const { User, Department } = models;

const isOrgAdmin = (req, res, next) => {
  const role = req.user.role?.toLowerCase()?.trim();
  const allowed = ['organization admin'];
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
  const transaction = await sequelize.transaction();
  try {
    const { email, password, role, name, status, deptId } = req.body;
    
    const existing = await User.findOne({ where: { email }, transaction });
    if (existing) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const generatedUid = `${role.toUpperCase().substring(0,3)}-${Date.now().toString().slice(-6)}`;

    // ENFORCE WORKFORCE CONTROL: No employee creation without vacancy
    const workforceRoles = ['employee', 'staff', 'faculty', 'bde', 'counselor'];
    if (workforceRoles.includes(role.toLowerCase()) && !req.body.vacancyId) {
      await transaction.rollback();
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
    }, { transaction });

    // Handle Authority Succession if the new user is active
    if (newUser.status === 'active') {
      await handleAuthoritySuccession(role, newUser.uid, transaction, req.user.uid);
    }

    await transaction.commit();
    const userObj = newUser.toJSON();
    delete userObj.password;
    res.status(201).json(userObj);
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

router.put('/:uid', verifyToken, isOrgAdmin, async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { uid } = req.params;
    const { email, password, role, name, status, deptId } = req.body;

    const user = await User.findByPk(uid, { transaction });
    if (!user) {
      await transaction.rollback();
      return res.status(404).json({ error: 'User not found' });
    }

    if (email !== user.email) {
      const existing = await User.findOne({ where: { email }, transaction });
      if (existing) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Email already taken by another user' });
      }
    }

    const updates = { email, role, name, status, deptId: deptId || null };
    if (password && password.trim() !== '') {
      updates.password = await bcrypt.hash(password, 10);
      updates.devPassword = password;
    }

    const oldRole = user.role;
    const oldStatus = user.status;
    
    await user.update(updates, { transaction });

    // Handle Authority Succession if role or status changed to active
    const roleChanged = role && role !== oldRole;
    const becameActive = status === 'active' && oldStatus !== 'active';
    
    if (user.status === 'active' && (roleChanged || becameActive)) {
      await handleAuthoritySuccession(user.role, user.uid, transaction, req.user.uid);
    }
    
    await transaction.commit();
    const userObj = user.toJSON();
    delete userObj.password;
    res.json(userObj);
  } catch (error) {
    if (transaction) await transaction.rollback();
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
