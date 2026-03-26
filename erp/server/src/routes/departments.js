import express from 'express';
import { models } from '../models/index.js';
import { verifyToken } from '../middleware/verifyToken.js';

const router = express.Router();
const { Department, User } = models;

const isOrgAdmin = (req, res, next) => {
  if (req.user.role !== 'org-admin') {
    return res.status(403).json({ error: 'Access denied: Requires org-admin role' });
  }
  next();
};

router.get('/', verifyToken, isOrgAdmin, async (req, res) => {
  try {
    const departments = await Department.findAll({
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
    const { name, type, adminId, status, features, activateNow } = req.body;
    
    const existing = await Department.findOne({ where: { name } });
    if (existing) {
      return res.status(400).json({ error: 'Department name already exists' });
    }

    // Handle status consistency
    let finalStatus = 'active';
    if (status) finalStatus = status.toLowerCase();
    else if (activateNow !== undefined) finalStatus = activateNow ? 'active' : 'inactive';

    const newDept = await Department.create({
      name, 
      type, 
      adminId: adminId || null, 
      status: finalStatus,
      metadata: features ? { features } : null
    });

    res.status(201).json(newDept);
  } catch (error) {
    console.error('Create department error:', error);
    res.status(500).json({ error: error.message || 'Failed to create department' });
  }
});

router.put('/:id', verifyToken, isOrgAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, adminId, status } = req.body;

    const dept = await Department.findByPk(id);
    if (!dept) {
      return res.status(404).json({ error: 'Department not found' });
    }

    await dept.update({ name, type, adminId: adminId || null, status });
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
