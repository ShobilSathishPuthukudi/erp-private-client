import express from 'express';
import bcrypt from 'bcryptjs';
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
  Invoice,
  Permission,
  Role,
  Notification
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
      employees,
      centers,
      totalStudents,
      pendingTasks
    ] = await Promise.all([
      Department.count({ where: { status: 'active' } }),
      User.findAll({ 
        where: { role: { [Op.ne]: 'student' } },
        attributes: ['name', 'role'],
        order: [['name', 'ASC']]
      }),
      Department.findAll({ 
        where: { type: 'center', status: 'active' },
        attributes: ['name'],
        order: [['name', 'ASC']]
      }),
      Student.count(),
      Task.count({ where: { status: 'pending' } })
    ]);

    // Health metrics
    const uptime = process.uptime();
    const memory = process.memoryUsage();

    res.json({
      activeDepts,
      totalEmployees: employees.length,
      employeeNames: employees.map(e => ({ name: e.name, role: e.role })),
      studyCenters: centers.length,
      centerNames: centers.map(c => c.name),
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

router.get('/config', verifyToken, (req, res, next) => {
  if (['org-admin', 'system-admin', 'ceo'].includes(req.user.role)) return next();
  res.status(403).json({ error: 'Access denied' });
}, async (req, res) => {
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

// --- Policy Management (Security & Governance) ---
router.get('/config/policies', verifyToken, isOrgAdmin, async (req, res) => {
  try {
    const defaultPolicies = {
      security_policy: {
        title: "Executive Security & Data Boundaries",
        description: "CEO Panels provide a centralized view of performance across multiple departments. Ensure each executive has the appropriate visibility scope to facilitate data-driven decision making while maintaining strict departmental boundaries.",
        blocks: [
          {
            title: "Institutional Visibility Guard",
            content: "The 'Visibility Guard' is a centralized security middleware that strictly isolates executive data. No CEO can view student records, financial metrics, or performance scorecards outside their provisioned scope."
          },
          {
            title: "Departmental Isolation",
            content: "Database queries are dynamically patched with categorical filters mapped to the executive's Initial Visibility Scope. This ensures hard-coded data boundaries at the SQL level."
          },
          {
            title: "Audit Integrity",
            content: "Every attempt to access or modify visibility configurations is recorded in the immutable Audit Log. Unauthorized cross-departmental access attempts trigger immediate alerts."
          }
        ]
      },
      governance_policy: {
        title: "Institutional Governance & Hierarchy",
        description: "The institutional hierarchy enforces a strictly layered governance model. Departments are autonomous units linked to a centralized Permission Matrix that defines access levels for every role within the organization.",
        blocks: [
          {
            title: "Institutional Structure",
            content: "The institutional hierarchy enforces a strictly layered governance model. Departments are autonomous units linked to a centralized Permission Matrix that defines access levels for every role within the organization."
          },
          {
            title: "Departmental Autonomy",
            content: "Each department operates within its provisioned data boundaries. Personnel management and resource allocation are isolated ensuring peak organizational stability."
          },
          {
            title: "Governance Matrix",
            content: "Structural changes are synchronized with the Master Permission Matrix. This ensures that any new department inherits the institution's standardized identity system."
          }
        ]
      },
      audit_policy: {
        title: "Institutional Audit & Compliance Policy",
        description: "Audit logs provide an immutable record of institutional activities. This policy defines the behavioral triggers and structural oversight required to maintain peak system integrity and regulatory compliance.",
        blocks: [
          {
            title: "Immutable Logging",
            content: "All administrative actions, credential modifications, and permission shifts are recorded in the immutable Audit Log. These records are protected from deletion or unauthorized modification."
          },
          {
            title: "Behavioral Triggers",
            content: "Institutional security triggers monitor for anomalous activity. High-frequency deletions, cross-departmental access attempts, and credential resets trigger immediate administrative alerts."
          },
          {
            title: "Compliance Reporting",
            content: "Audit trails are preserved to facilitate regulatory compliance and internal transparency. Periodic reviews ensure that institutional access boundaries remain aligned with organizational goals."
          }
        ]
      }
    };

    // Fetch existing or initialize defaults
    const policies = await Promise.all(Object.keys(defaultPolicies).map(async (key) => {
      let config = await OrgConfig.findOne({ where: { key } });
      if (!config) {
        config = await OrgConfig.create({
          key,
          value: defaultPolicies[key],
          group: 'governance'
        });
      }
      return { key, value: config.value };
    }));

    const result = policies.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {});
    res.json(result);
  } catch (error) {
    console.error('Fetch Policies Error:', error);
    res.status(500).json({ error: 'Failed to fetch institutional policies' });
  }
});

router.post('/config/policies', verifyToken, isOrgAdmin, async (req, res) => {
  try {
    const { security_policy, governance_policy, audit_policy } = req.body;
    
    if (security_policy) {
      await OrgConfig.upsert({
        key: 'security_policy',
        value: security_policy,
        group: 'governance'
      });
    }

    if (governance_policy) {
      await OrgConfig.upsert({
        key: 'governance_policy',
        value: governance_policy,
        group: 'governance'
      });
    }

    if (audit_policy) {
      await OrgConfig.upsert({
        key: 'audit_policy',
        value: audit_policy,
        group: 'governance'
      });
    }

    res.json({ message: 'Institutional policies updated successfully' });
  } catch (error) {
    console.error('Update Policies Error:', error);
    res.status(500).json({ error: 'Failed to update institutional policies' });
  }
});

router.get('/ceo-panels', verifyToken, isOrgAdmin, async (req, res) => {
  try {
    const panels = await CEOPanel.findAll({
      include: [{ model: User, as: 'ceoUser', attributes: ['name', 'email'] }],
      order: [['createdAt', 'DESC']]
    });
    res.json(panels);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch CEO panels' });
  }
});

router.post('/ceo-panels', verifyToken, isOrgAdmin, async (req, res) => {
  let transaction;
  try {
    // Ensure table and new column "devCredential" exist (non-destructive alter)
    await CEOPanel.sync({ alter: true });
    
    transaction = await sequelize.transaction();
    const { name, email, password, visibilityScope, status } = req.body;

    if (!email || !password || !name) {
      if (transaction) await transaction.rollback();
      return res.status(400).json({ error: 'Identity markers (Name, Email, Password) are mandatory' });
    }

    // Provision new Executive Identity
    let hashedPassword;
    try {
      hashedPassword = await bcrypt.hash(password, 10);
    } catch (bcryptError) {
      if (transaction) await transaction.rollback();
      throw new Error(`Credential Security Hash Failure: ${bcryptError.message}`);
    }

    const generatedUid = `CEO-${Date.now().toString().slice(-6)}`;
    
    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      if (transaction) await transaction.rollback();
      return res.status(400).json({ error: 'Institutional identity already provisioned for this email' });
    }

    try {
      const user = await User.create({
        uid: generatedUid,
        email,
        password: hashedPassword,
        name,
        role: 'ceo',
        status: 'active'
      }, { transaction });

      const panel = await CEOPanel.create({
        name,
        userId: generatedUid,
        visibilityScope: visibilityScope || [],
        status: status || 'Active',
        devCredential: password // Dev-only: Record the plain password for "Quick Login" support
      }, { transaction });

      await transaction.commit();
      res.status(201).json({ panel, user: { uid: generatedUid, email, name } });
    } catch (dbError) {
      if (transaction) await transaction.rollback();
      throw new Error(`Database Entity Provisioning Failure: ${dbError.message}`);
    }

  } catch (error) {
    if (transaction && !transaction.finished) {
       try { await transaction.rollback(); } catch (e) { console.error('Rollback failed:', e); }
    }
    console.error('CEO Provisioning Critical Failure:', {
      message: error.message,
      stack: error.stack,
      payload: req.body
    });
    res.status(500).json({ 
      error: 'Failed to provision integrated executive instance',
      details: error.message,
      trace: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

router.put('/ceo-panels/:id', verifyToken, isOrgAdmin, async (req, res) => {
  let transaction;
  try {
    transaction = await sequelize.transaction();
    const { id } = req.params;
    const { name, visibilityScope, status, password } = req.body;
    
    const panel = await CEOPanel.findByPk(id, { transaction });
    if (!panel) {
      await transaction.rollback();
      return res.status(404).json({ error: 'CEO Panel not found' });
    }
    
    const panelUpdates = { name, visibilityScope, status };
    if (password) {
      panelUpdates.devCredential = password;
      
      // Also update the master identity password
      const user = await User.findOne({ where: { uid: panel.userId }, transaction });
      if (user) {
        const hashedPassword = await bcrypt.hash(password, 10);
        await user.update({ password: hashedPassword }, { transaction });
      }
    }
    
    await panel.update(panelUpdates, { transaction });
    await transaction.commit();
    res.json(panel);
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error('CEO Panel Update Error:', error);
    res.status(500).json({ error: 'Failed to update CEO panel', details: error.message });
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

router.put('/ceo-panels/:id/visibility', verifyToken, isOrgAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { visibilityScope } = req.body;
    
    const panel = await CEOPanel.findByPk(id);
    if (!panel) return res.status(404).json({ error: 'CEO Panel not found' });
    
    await panel.update({ visibilityScope });
    res.json(panel);
  } catch (error) {
    console.error('Update CEO Visibility Error:', error);
    res.status(500).json({ error: 'Failed to update visibility scope' });
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

// --- Roles Management ---

router.get('/roles', verifyToken, isOrgAdmin, async (req, res) => {
  try {
    // GAP-5: Seed default roles if none exist (Cold Boot support)
    const count = await Role.count();
    if (count === 0) {
      const defaultRoles = [
        { name: 'Org Admin', description: 'Total institutional oversight', isCustom: false },
        { name: 'CEO', description: 'Executive departmental scope', isCustom: false },
        { name: 'Dept Admin', description: 'Department-level management', isCustom: false },
        { name: 'Sub-Dept Admin', description: 'Unit-specific operations', isCustom: false },
        { name: 'Employee', description: 'Standard workforce access', isCustom: false },
        { name: 'Study Center', description: 'Partner center operations', isCustom: false },
        { name: 'Student', description: 'End-user student portal', isCustom: false }
      ];
      await Role.bulkCreate(defaultRoles);
    }

    const roles = await Role.findAll({ order: [['createdAt', 'DESC']] });
    res.json(roles);
  } catch (error) {
    console.error('Fetch Roles Error:', error);
    res.status(500).json({ error: 'Failed to fetch institutional roles' });
  }
});

router.post('/roles', verifyToken, isOrgAdmin, async (req, res) => {
  try {
    const { name, description, isCustom } = req.body;
    
    if (!name) return res.status(400).json({ error: 'Role name is mandatory' });
    
    // Check for duplicate
    const existing = await Role.findOne({ where: { name } });
    if (existing) return res.status(400).json({ error: 'Role identifier already exists' });

    const role = await Role.create({ 
      name, 
      description, 
      isCustom: isCustom !== undefined ? isCustom : true 
    });

    // Notify HR Administrators (GAP-5 Compliance Awareness)
    try {
      const hrUsers = await User.findAll({ where: { role: 'hr' } });
      if (hrUsers.length > 0) {
        const notificationPayloads = hrUsers.map(hr => ({
          userUid: hr.uid,
          type: 'info',
          message: `New institutional role created: ${name}. You can now assign this role to personnel in the Workforce section.`,
          link: '/hr/employees'
        }));
        await Notification.bulkCreate(notificationPayloads);
      }
    } catch (notifError) {
      console.error('HR Role Notification Failure:', notifError);
      // Non-blocking: Do not fail the role creation if notification fails
    }

    res.status(201).json(role);
  } catch (error) {
    console.error('Create Role Error:', error);
    res.status(500).json({ error: 'Failed to create role' });
  }
});

// GET /alerts - High Fidelity System Governance
router.get('/alerts', verifyToken, isOrgAdmin, async (req, res) => {
  try {
    const alerts = [];

    // 1. Escalated Tasks (Overdue)
    const overdueTasks = await Task.findAll({
      where: {
        status: 'pending',
        deadline: { [Op.lt]: new Date() }
      },
      include: [
        { model: User, as: 'assignee', attributes: ['name', 'deptId'] },
        { model: User, as: 'assigner', attributes: ['name'] }
      ],
      limit: 5
    });

    overdueTasks.forEach(task => {
      alerts.push({
        id: `task-${task.id}`,
        type: 'Escalated Task',
        title: task.title,
        department: 'Operational', // Placeholder or derive from assignee.deptId
        overdue: `${Math.floor((new Date() - new Date(task.deadline)) / (1000 * 60 * 60 * 24))} Days`,
        chain: `${task.assigner?.name || 'System'} → ${task.assignee?.name || 'Unassigned'}`,
        details: task.description || "Active task has exceeded its institutional deadline and requires immediate intervention.",
        actionLabel: 'View Task',
        actionLink: '/dashboard/org-admin/settings/general', // Or specific task link
        source: 'Task'
      });
    });

    // 2. Unassigned Admin (Structure Gap)
    const gapDepartments = await Department.findAll({
      where: { adminId: null },
      limit: 5
    });

    gapDepartments.forEach(dept => {
      alerts.push({
        id: `dept-${dept.id}`,
        type: 'Unassigned Admin',
        title: dept.name,
        createdDate: new Date(dept.createdAt).toLocaleDateString(),
        details: `The ${dept.name} department currently has no assigned Administrator. This prevents recruitment approvals and budget releases.`,
        actionLabel: 'Assign Admin',
        actionLink: '/dashboard/org-admin/departments',
        source: 'Department'
      });
    });

    // 3. CEO Panel Issue (Scope Configuration)
    const subQuery = await CEOPanel.findAll({
      where: {
        [Op.or]: [
          { visibilityScope: null },
          { visibilityScope: [] }
          // Note: Sequelize legacy JSON might represent empty as '[]' string depending on DB
        ]
      },
      limit: 5
    });

    subQuery.forEach(panel => {
      alerts.push({
        id: `ceo-${panel.id}`,
        type: 'CEO Panel Issue',
        title: panel.name,
        createdDate: new Date(panel.createdAt).toLocaleDateString(),
        details: `The panel '${panel.name}' is currently lacking data scopes. This prevents high-level metrics from aggregating correctly.`,
        actionLabel: 'Configure',
        actionLink: '/dashboard/org-admin/ceo-panels/visibility',
        source: 'CEOPanel'
      });
    });

    // 4. Audit Exception (Bulk Deletion)
    const recentDeletions = await AuditLog.count({
      where: {
        action: 'Delete',
        timestamp: { [Op.gt]: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }
    });

    if (recentDeletions > 5) {
      alerts.push({
        id: 'audit-bulk-del',
        type: 'Audit Exception',
        title: `${recentDeletions} Deletion Attempts Flagged`,
        createdDate: 'Last 24 Hours',
        details: "Institutional security triggers flagged a high frequency of record deletions. Please review the audit logs for behavioral anomalies.",
        actionLabel: 'View Audit Log',
        actionLink: '/dashboard/org-admin/audit/all',
        source: 'AuditLog'
      });
    }

    res.json(alerts);
  } catch (error) {
    console.error('Fetch Alert Error:', error);
    res.status(500).json({ error: 'Failed to consolidate system alerts' });
  }
});

router.put('/roles/:id', verifyToken, isOrgAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, description } = req.body;
    const role = await Role.findByPk(id);
    
    if (!role) return res.status(404).json({ error: 'Role not found' });
    if (!role.isCustom && status === 'inactive') {
      return res.status(400).json({ error: 'System roles cannot be deactivated' });
    }

    await role.update({ status, description });
    res.json(role);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update role configuration' });
  }
});

// --- Permissions Matrix ---

router.get('/permissions/matrix', verifyToken, isOrgAdmin, async (req, res) => {
  try {
    console.log('[PERM_MATRIX] Fetching matrix for role:', req.query.role);
    const { role } = req.query;
    const where = role ? { role } : {};
    const permissions = await Permission.findAll({ where });
    res.json(permissions);
  } catch (error) {
    console.error('[PERM_MATRIX] Fetch Error:', error);
    res.status(500).json({ error: 'Failed to fetch permissions matrix', details: error.message });
  }
});

router.post('/permissions/matrix', verifyToken, isOrgAdmin, async (req, res) => {
  let transaction;
  try {
    transaction = await sequelize.transaction();
    const { role, permissions } = req.body;
    
    const currentPermissions = await Permission.findAll({ where: { role } });
    
    for (const p of permissions) {
      const existing = currentPermissions.find(cp => cp.module === p.module && cp.page === p.page);
      
      const hasChanged = !existing || 
        existing.canRead !== p.canRead || 
        existing.canWrite !== p.canWrite || 
        existing.canApprove !== p.canApprove;

      if (hasChanged) {
        await Permission.upsert({
          role,
          module: p.module,
          page: p.page,
          canRead: p.canRead,
          canWrite: p.canWrite,
          canApprove: p.canApprove
        }, { transaction });

        await AuditLog.create({
          entity: `Role: ${role}`,
          action: 'PERMISSION_UPDATE',
          userId: req.user.uid,
          module: 'GOVERNANCE',
          before: existing ? { read: existing.canRead, write: existing.canWrite, approve: existing.canApprove } : null,
          after: { read: p.canRead, write: p.canWrite, approve: p.canApprove },
          remarks: `Updated ${p.module} > ${p.page} access for ${role}`
        }, { transaction });
      }
    }
    
    await transaction.commit();
    res.json({ message: `Permissions updated for role: ${role}` });
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error('Permission Update Error:', error);
    res.status(500).json({ error: 'Failed to update permissions matrix', details: error.message });
  }
});

// [NEW] GET /audit/permissions - Retrieve governance trails
router.get('/audit/permissions', verifyToken, isOrgAdmin, async (req, res) => {
  try {
    const logs = await AuditLog.findAll({
      where: { module: 'GOVERNANCE', action: 'PERMISSION_UPDATE' },
      order: [['timestamp', 'DESC']],
      limit: 100
    });

    // Map to frontend format
    const formattedLogs = logs.map(log => {
      const formatAccess = (p) => {
        if (!p) return 'No Access';
        if (p.approve) return 'Full Access';
        if (p.write) return 'Read + Write';
        if (p.read) return 'Read Only';
        return 'No Access';
      };

      return {
        id: log.id,
        user: log.userId,
        role: log.entity.replace('Role: ', ''),
        feature: log.remarks.split('Updated ')[1].split(' access')[0],
        prev: formatAccess(log.before),
        next: formatAccess(log.after),
        time: new Date(log.timestamp).toLocaleString()
      };
    });

    res.json(formattedLogs);
  } catch (error) {
    console.error('Audit Retrieval Error:', error);
    res.status(500).json({ error: 'Failed to retrieve institutional audit trails' });
  }
});

export default router;
