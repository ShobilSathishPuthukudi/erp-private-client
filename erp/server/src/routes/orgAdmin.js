import express from 'express';
import { Op } from 'sequelize';
import { models, sequelize } from '../models/index.js';
import { verifyToken } from '../middleware/verifyToken.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const { 
  OrgConfig, 
  CustomField, 
  CEOPanel, 
  Department, 
  User, 
  Student, 
  AuditLog,
  Task,
  Invoice
} = models;

// Middleware to ensure Org Admin role
const isOrgAdmin = (req, res, next) => {
  if (req.user.role !== 'org-admin' && req.user.role !== 'system-admin') {
    return res.status(403).json({ error: 'Access denied: Org Admin privileges required' });
  }
  next();
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(process.cwd(), 'uploads', 'branding');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `org-logo-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB for logo
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'));
    }
  }
});

// --- Dashboard & Alerts ---

router.get('/dashboard/stats', verifyToken, isOrgAdmin, async (req, res) => {
  try {
    const [
      activeDepts,
      totalEmployees,
      studyCenters,
      totalStudents,
      pendingTasks
    ] = await Promise.all([
      Department.count({ where: { status: 'active' } }),
      User.count({ where: { role: { [Op.not]: 'student' } } }),
      Department.count({ where: { type: 'center', status: 'active' } }),
      Student.count(),
      Task.count({ where: { status: 'pending' } })
    ]);

    // Health metrics
    const uptime = process.uptime();
    const memory = process.memoryUsage();

    res.json({
      activeDepts,
      totalEmployees,
      studyCenters,
      totalStudents,
      pendingTasks,
      systemHealth: {
        uptime: Math.round(uptime / 3600), // hours
        memoryUsage: Math.round(memory.heapUsed / 1024 / 1024), // MB
        dbStatus: 'Optimal'
      }
    });
  } catch (error) {
    console.error('Org Admin Stats Error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// --- Organization Config (Branding, Integrations, Storage) ---

router.get('/config', verifyToken, isOrgAdmin, async (req, res) => {
  try {
    const configs = await OrgConfig.findAll();
    res.json(configs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch configuration' });
  }
});

router.post('/config', verifyToken, isOrgAdmin, async (req, res) => {
  try {
    const { key, value, group, isEncrypted } = req.body;
    const [config, created] = await OrgConfig.upsert({
      key, value, group, isEncrypted
    });
    res.json({ config, created });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update configuration' });
  }
});

router.post('/logo', verifyToken, isOrgAdmin, upload.single('logo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No logo file provided' });
    }

    const logoUrl = `/uploads/branding/${req.file.filename}`;
    
    // Update or create ORG_LOGO in config
    await OrgConfig.upsert({
      key: 'ORG_LOGO',
      value: logoUrl,
      group: 'General'
    });

    res.json({ 
      message: 'Logo updated successfully',
      logoUrl 
    });
  } catch (error) {
    console.error('Logo Upload Error:', error);
    res.status(500).json({ error: 'Failed to upload institution logo' });
  }
});

// --- CEO Panels ---

router.get('/ceo-panels', verifyToken, isOrgAdmin, async (req, res) => {
  try {
    const panels = await CEOPanel.findAll({
      include: [{ model: User, as: 'ceoUser', attributes: ['name', 'email'] }]
    });
    res.json(panels);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch CEO panels' });
  }
});

router.post('/ceo-panels', verifyToken, isOrgAdmin, async (req, res) => {
  try {
    const panel = await CEOPanel.create(req.body);
    res.json(panel);
  } catch (error) {
    res.status(500).json({ error: 'Failed to provision CEO panel' });
  }
});

router.put('/ceo-panels/:id', verifyToken, isOrgAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const panel = await CEOPanel.findByPk(id);
    if (!panel) return res.status(404).json({ error: 'CEO Panel not found' });
    
    await panel.update(req.body);
    res.json(panel);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update CEO panel' });
  }
});

router.delete('/ceo-panels/:id', verifyToken, isOrgAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const panel = await CEOPanel.findByPk(id);
    if (!panel) return res.status(404).json({ error: 'CEO Panel not found' });
    
    await panel.destroy();
    res.json({ message: 'CEO Panel deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete CEO panel' });
  }
});

// --- Custom Fields ---

router.get('/custom-fields/:entity', verifyToken, isOrgAdmin, async (req, res) => {
  try {
    const fields = await CustomField.findAll({
      where: { entityType: req.params.entity, isActive: true }
    });
    res.json(fields);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch custom fields' });
  }
});

router.post('/custom-fields', verifyToken, isOrgAdmin, async (req, res) => {
  try {
    const field = await CustomField.create(req.body);
    res.json(field);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create custom field' });
  }
});

// --- Permissions Matrix (Integration Placeholder) ---

router.get('/permissions/matrix', verifyToken, isOrgAdmin, async (req, res) => {
  // In a full implementation, this would fetch from a dedicated Permissions table
  // For now, we return a structured default matrix
  res.json({
    roles: ['Org Admin', 'CEO', 'Dept Admin', 'Employee', 'Student'],
    modules: ['Finance', 'HR', 'Academic', 'Operations']
  });
});

export default router;
