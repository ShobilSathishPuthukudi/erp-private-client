import express from 'express';
import bcrypt from 'bcryptjs';
import { models } from '../models/index.js';
import { verifyToken } from '../middleware/verifyToken.js';

const router = express.Router();
const { Department, User } = models;

const isOrgAdmin = (req, res, next) => {
  const allowedRoles = ['Organization Admin', 'org-admin', 'system-admin', 'Finance Admin', 'HR Admin', 'Operations Admin'];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied: Requires administrative or institutional role' });
  }
  next();
};

router.get('/', verifyToken, isOrgAdmin, async (req, res) => {
  try {
    const departments = await Department.findAll({
      include: [{ model: User, as: 'admin', attributes: ['name', 'email', 'uid'] }],
      order: [['createdAt', 'DESC']]
    });
    res.json(departments);
  } catch (error) {
    console.error('Fetch departments error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch departments' });
  }
});

router.post('/', verifyToken, isOrgAdmin, async (req, res) => {
  try {
    const { name, type, adminId, status, features, activateNow, adminName, adminEmail, adminPassword } = req.body;
    
    const existing = await Department.findOne({ where: { name } });
    if (existing) {
      return res.status(400).json({ error: 'Department name already exists' });
    }

    let finalAdminId = adminId;

    // Handle new admin creation if credentials are provided
    if (adminEmail && adminPassword && adminName) {
      const userExists = await User.findOne({ where: { email: adminEmail } });
      if (userExists) {
        return res.status(400).json({ error: 'Admin email already exists' });
      }

      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      
      // Determine role based on department type
      let role = 'Operations Admin';
      const typeLower = type.toLowerCase();
      if (['HR Admin', 'Finance Admin', 'Sales & CRM Admin', 'Operations Admin'].includes(typeLower)) {
        role = typeLower;
      }

      const generatedUid = `${role.toUpperCase().substring(0,3)}-${Date.now().toString().slice(-6)}`;

      const newUser = await User.create({
        uid: generatedUid,
        email: adminEmail,
        password: hashedPassword,
        devPassword: adminPassword,
        role: role,
        name: adminName,
        status: 'active'
      });

      finalAdminId = newUser.uid;
    }

    // Handle status consistency
    let finalStatus = 'active';
    if (status) finalStatus = status.toLowerCase();
    else if (activateNow !== undefined) finalStatus = activateNow ? 'active' : 'inactive';

    const newDept = await Department.create({
      name, 
      type, 
      adminId: finalAdminId || null, 
      status: finalStatus,
      metadata: features ? { features } : null
    });

    // SYNC: Ensure the assigned admin's User record also points to this department
    if (finalAdminId) {
      await User.update({ deptId: newDept.id }, { where: { uid: finalAdminId } });
    }

    res.status(201).json(newDept);
  } catch (error) {
    console.error('Create department error:', error);
    res.status(500).json({ error: error.message || 'Failed to create department' });
  }
});

router.put('/:id', verifyToken, isOrgAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, adminId, status, features, adminName, adminEmail, adminPassword } = req.body;

    const dept = await Department.findByPk(id);
    if (!dept) {
      return res.status(404).json({ error: 'Department not found' });
    }

    let finalAdminId = adminId;

    // Support creating a new admin during update if credentials are provided
    if (adminEmail && adminPassword && adminName) {
      const userExists = await User.findOne({ where: { email: adminEmail } });
      if (userExists) {
        return res.status(400).json({ error: 'Admin email already exists' });
      }

      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      
      // Determine role based on department type
      let role = 'Operations Admin';
      const typeLower = type ? type.toLowerCase() : (dept.type || 'custom').toLowerCase();
      if (['HR Admin', 'Finance Admin', 'Sales & CRM Admin', 'Operations Admin'].includes(typeLower)) {
        role = typeLower;
      }

      const generatedUid = `${role.toUpperCase().substring(0,3)}-${Date.now().toString().slice(-6)}`;

      const newUser = await User.create({
        uid: generatedUid,
        email: adminEmail,
        password: hashedPassword,
        devPassword: adminPassword,
        role: role,
        name: adminName,
        status: 'active',
        deptId: dept.id // Auto-link to this department
      });

      finalAdminId = newUser.uid;
    }

    const updateData = { name, type, adminId: finalAdminId || null, status };
    if (features) updateData.metadata = { features };

    await dept.update(updateData);

    // SYNC: Ensure the assigned admin's User record also points to this department
    if (finalAdminId) {
      // Clear previous admin's link (optional but good for data integrity)
      if (dept.adminId && dept.adminId !== finalAdminId) {
        await User.update({ deptId: null }, { where: { uid: dept.adminId, deptId: dept.id } });
      }
      // Set new admin's link
      await User.update({ deptId: dept.id }, { where: { uid: finalAdminId } });
    }

    await dept.reload({ include: [{ model: User, as: 'admin', attributes: ['name', 'email', 'uid'] }] });
    res.json(dept);
  } catch (error) {
    console.error('Update department error:', error);
    res.status(500).json({ error: 'Failed to update department' });
  }
});

router.delete('/:id', verifyToken, isOrgAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const dept = await Department.findByPk(id);
    if (!dept) {
      return res.status(404).json({ error: 'Department not found' });
    }
    
    await dept.destroy();
    res.json({ message: 'Department deleted successfully' });
  } catch (error) {
    console.error('Delete department error:', error);
    res.status(500).json({ error: 'Failed to delete department' });
  }
});

export default router;
