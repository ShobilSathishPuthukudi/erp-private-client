import express from 'express';
import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import { models, sequelize } from '../models/index.js';
import { verifyToken } from '../middleware/verifyToken.js';
import { handleAuthoritySuccession } from '../utils/governance/singletonEnforcement.js';
import { SINGLETON_ROLES } from '../config/rbac.js';
import { augmentTaskCollection } from '../utils/taskAugmentation.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { CORE_DEPARTMENTS, SEEDED_ADMIN_ROLE_NAMES, SUB_DEPARTMENTS, normalizeInstitutionRoleName, normalizeSubDepartmentName } from '../config/institutionalStructure.js';

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
  Notification,
  Program,
  PermissionVersion,
  RolePermissionShadow
} = models;

import { clearMatrixCache } from '../middleware/rbac.js';

// Helper to check for role authority conflicts
const checkAuthorityConflict = async (roleName, excludeUid = null) => {
  const roleLower = roleName?.toLowerCase()?.trim();
  const singletonLowers = SINGLETON_ROLES.map(r => r.toLowerCase());
  
  if (!singletonLowers.includes(roleLower)) return false;
  
  const where = { role: roleName, status: 'active' };
  if (excludeUid) where.uid = { [Op.ne]: excludeUid };
  const existingCount = await User.count({ where });
  return existingCount >= 1;
};

// Middleware to ensure Org Admin role
const isOrgAdmin = (req, res, next) => {
  const role = normalizeInstitutionRoleName(req.user.role)?.toLowerCase()?.trim();
  const allowedRoles = [
    'organization admin', 
    'operations', 
    'academic operations admin', 
    'operations admin'
  ];
  
  // Academic Operations Admins are permitted to view institutional hierarchy and dashboard telemetry
  if (!allowedRoles.includes(role)) {
    console.warn(`[AUTH-FAILURE] Role: '${role}' denied access to Org Admin dashboard.`);
    return res.status(403).json({ error: 'Access denied: Org Admin or Operations privileges required' });
  }
  next();
};

const isRoleMappingManager = (req, res, next) => {
  const role = normalizeInstitutionRoleName(req.user.role)?.toLowerCase()?.trim();
  if (role !== 'hr admin') {
    return res.status(403).json({ error: 'Access denied: only HR Admin can assign seeded admin roles' });
  }
  next();
};

const isPrimaryOrgAdmin = (req, res, next) => {
  const role = normalizeInstitutionRoleName(req.user.role)?.toLowerCase()?.trim();
  if (role !== 'organization admin') {
    return res.status(403).json({ error: 'Access denied: Organization Admin privileges required' });
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
      activeSubDepts,
      totalRoles,
      employees,
      centers,
      totalStudents,
      pendingTasks
    ] = await Promise.all([
      Department.findAll({ 
        where: { parentId: null, type: 'departments', status: 'active' },
        attributes: ['name'],
        order: [['name', 'ASC']]
      }),
      Department.findAll({ 
        where: { type: 'sub-departments', status: 'active' },
        attributes: ['name'],
        order: [['name', 'ASC']]
      }),
      Role.findAll({ 
        attributes: ['name'],
        order: [['name', 'ASC']]
      }),
      User.findAll({
        where: {
          status: 'active',
          [Op.and]: [
            { role: { [Op.ne]: 'student' } },
            { role: { [Op.notLike]: '%admin%' } },
            { role: { [Op.notLike]: '%ceo%' } },
            { role: { [Op.notLike]: '%Partner Center%' } },
            { role: { [Op.ne]: 'partner-center' } }
          ]
        },
        attributes: ['name', 'role'],
        order: [['name', 'ASC']]
      }),
      Department.findAll({
        where: {
          type: { [Op.in]: ['partner centers', 'partner-center', 'partner center', 'study-center'] },
          auditStatus: 'approved'
        },
        attributes: ['name'],
        order: [['name', 'ASC']]
      }),
      Student.count({ where: { status: 'ENROLLED' } }),
      Task.count({ 
        where: { 
          status: { [Op.ne]: 'completed' },
          deadline: { [Op.lt]: new Date() }
        } 
      })
    ]);

    const pendingCenters = await Department.findAll({
      where: {
        type: { [Op.in]: ['partner centers', 'partner-center', 'partner center', 'study-center'] },
        auditStatus: { [Op.in]: ['pending', 'PENDING_FINANCE'] }
      },
      attributes: ['name', 'auditStatus']
    });

    const pendingStudents = await Student.findAll({
      where: {
        status: { [Op.notIn]: ['ENROLLED', 'REJECTED', 'DRAFT'] }
      },
      attributes: ['name', 'status']
    });

    // 1. Student Intake (Last 6 Months)
    const growthData = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
      const monthName = date.toLocaleString('default', { month: 'short' });

      const studentCount = await Student.count({
        where: {
          status: { [Op.notIn]: ['DRAFT', 'REJECTED'] },
          createdAt: { [Op.between]: [startOfMonth, endOfMonth] }
        }
      });

      growthData.push({ name: monthName, students: studentCount });
    }

    // 2. Center Growth (Last 7 Days — per-day new registrations and approvals)
    const CENTER_TYPES = ['partner centers', 'partner-center', 'partner center', 'study-center'];
    const centerGrowth = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
      const endOfDay   = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
      const dayName = date.toLocaleString('default', { weekday: 'short' });

      // New center registrations created on this day
      const leads = await Department.count({
        where: {
          type: { [Op.in]: CENTER_TYPES },
          createdAt: { [Op.between]: [startOfDay, endOfDay] }
        }
      });

      // Centers that reached fully-approved status (Finance cleared) on this day
      // updatedAt is the best available proxy for approval date without a dedicated column
      const approved = await Department.count({
        where: {
          type: { [Op.in]: CENTER_TYPES },
          auditStatus: 'approved',
          updatedAt: { [Op.between]: [startOfDay, endOfDay] }
        }
      });

      centerGrowth.push({ day: dayName, leads, approved });
    }

    // 3. Action Queue (Real Tasks)
    const actionQueueRaw = await Task.findAll({
      where: { 
        status: { [Op.ne]: 'completed' },
        deadline: { [Op.lt]: new Date() }
      },
      include: [
        { model: User, as: 'assignee', attributes: ['name'], required: false },
        { model: User, as: 'assigner', attributes: ['name'], required: false }
      ],
      order: [['createdAt', 'DESC']],
      attributes: ['title', 'priority', 'description', 'status', 'deadline']
    });
    
    const actionQueue = augmentTaskCollection(actionQueueRaw);

    // 4. Student Demographics (By Program Type — enrolled only)
    const studentsByProgram = await Student.findAll({
      where: { status: 'ENROLLED' },
      include: [{ model: Program, attributes: ['type', 'name'] }],
      attributes: ['id', 'name', 'uid']
    });
    
    const demographics = studentsByProgram.reduce((acc, s) => {
      const type = s.program?.type || 'Other';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    const studentDetails = studentsByProgram.map(s => ({
      name: s.name,
      uid: s.uid,
      programType: s.program?.type || 'Other',
      programName: s.program?.name || 'Unassigned'
    }));

    // Health metrics
    const uptime = process.uptime();
    const memory = process.memoryUsage();

    res.json({
      activeDepts: activeDepts.length,
      deptNames: activeDepts.map(d => d.name),
      activeSubDepts: activeSubDepts.length,
      subDeptNames: activeSubDepts.map(d => d.name),
      totalRoles: totalRoles.length,
      roleNames: totalRoles.map(r => r.name),
      totalEmployees: employees.length,
      employeeNames: employees.map(e => ({ name: e.name, role: e.role })),
      totalStudyCenters: centers.length,
      centerNames: centers.map(c => c.name),
      totalStudents,
      pendingOverdueTasks: pendingTasks, // Renamed export map for frontend
      pendingCenterCount: pendingCenters.length,
      pendingCenters,
      pendingStudentCount: pendingStudents.length,
      pendingStudents,
      growthData,
      centerGrowth,
      actionQueue,
      demographics,
      studentDetails,
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

router.get('/config', verifyToken, async (req, res) => {
  try {
    const configs = await OrgConfig.findAll();
    res.json(configs);
  } catch (error) {
    console.error('Fetch Config Error:', error);
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
    const existingUser = await User.unscoped().findOne({ where: { email } });
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

      // Handle Authority Succession
      await handleAuthoritySuccession(models, user.role, user.uid, transaction, req.user.uid);

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
        await user.update({ password: hashedPassword, devPassword: password }, { transaction });
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
    const roles = await Role.findAll({ order: [['createdAt', 'DESC']] });
    res.json(roles);
  } catch (error) {
    console.error('Fetch Roles Error:', error);
    res.status(500).json({ error: 'Failed to fetch institutional roles' });
  }
});

router.get('/admin-role-mappings', verifyToken, isRoleMappingManager, async (req, res) => {
  try {
    const roles = await Role.findAll({
      where: {
        name: { [Op.in]: SEEDED_ADMIN_ROLE_NAMES },
        isSeeded: true
      },
      include: [
        {
          model: Department,
          as: 'scopeDepartment',
          attributes: ['id', 'name', 'status'],
          required: false
        },
        {
          model: User,
          as: 'assignedUser',
          attributes: ['uid', 'name', 'email', 'status', 'deptId', 'subDepartment', 'avatar'],
          required: false
        }
      ],
      order: [['scopeType', 'ASC'], ['name', 'ASC']]
    });

    const payload = roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      status: role.status,
      scopeType: role.scopeType,
      scopeSubDepartment: role.scopeSubDepartment,
      department: role.scopeType === 'sub_department'
        ? `${role.scopeDepartment?.name || role.department} / ${role.scopeSubDepartment}`
        : (role.scopeDepartment?.name || role.department),
      departmentId: role.scopeDepartmentId,
      assignedUser: role.assignedUser,
      adminPanelPassword: role.devRolePassword || null
    }));

    res.json(payload);
  } catch (error) {
    console.error('Fetch admin role mappings error:', error);
    res.status(500).json({ error: 'Failed to fetch admin role mappings' });
  }
});

router.get('/admin-role-mappings/:id/candidates', verifyToken, isRoleMappingManager, async (req, res) => {
  try {
    const role = await Role.findByPk(req.params.id);
    if (!role || !role.isSeeded || !SEEDED_ADMIN_ROLE_NAMES.includes(role.name)) {
      return res.status(404).json({ error: 'Mapped admin role not found' });
    }

    let eligibleDeptIds = [role.scopeDepartmentId];
    if (role.scopeType === 'sub_department') {
      const subDepartmentNode = await Department.findOne({
        where: {
          type: 'sub-departments',
          parentId: role.scopeDepartmentId,
          name: normalizeSubDepartmentName(role.scopeSubDepartment)
        }
      });
      if (subDepartmentNode) {
        eligibleDeptIds.push(subDepartmentNode.id);
      }
    }

    const employeeWhere = {
      deptId: { [Op.in]: eligibleDeptIds },
      status: 'active',
      [Op.or]: [
        { role: 'Employee' },
        { uid: role.assignedUserUid || '' }
      ]
    };

    if (role.scopeType === 'sub_department') {
      employeeWhere.subDepartment = {
        [Op.in]: [role.scopeSubDepartment, normalizeSubDepartmentName(role.scopeSubDepartment)]
      };
    }

    const candidates = await User.findAll({
      where: employeeWhere,
      attributes: ['uid', 'name', 'email', 'role', 'deptId', 'subDepartment', 'avatar'],
      order: [['name', 'ASC']]
    });

    res.json(candidates);
  } catch (error) {
    console.error('Fetch admin role candidates error:', error);
    res.status(500).json({ error: 'Failed to fetch admin candidates' });
  }
});

router.post('/admin-role-mappings/:id/assign', verifyToken, isRoleMappingManager, async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { userUid } = req.body;
    const role = await Role.findByPk(req.params.id, { transaction });

    if (!role || !role.isSeeded || !SEEDED_ADMIN_ROLE_NAMES.includes(role.name)) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Mapped admin role not found' });
    }

    const candidate = await User.findByPk(userUid, { transaction });
    if (!candidate) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Employee not found' });
    }

    let eligibleDeptIds = [role.scopeDepartmentId];
    if (role.scopeType === 'sub_department') {
      const subDepartmentNode = await Department.findOne({
        where: {
          type: 'sub-departments',
          name: normalizeSubDepartmentName(role.scopeSubDepartment),
          parentId: role.scopeDepartmentId
        },
        transaction
      });
      if (subDepartmentNode) {
        eligibleDeptIds.push(subDepartmentNode.id);
      }
    }

    const matchesDepartment = eligibleDeptIds.includes(candidate.deptId);
    const matchesSubDepartment = role.scopeType !== 'sub_department' || normalizeSubDepartmentName(candidate.subDepartment) === normalizeSubDepartmentName(role.scopeSubDepartment);
    const isEligibleEmployee = normalizeInstitutionRoleName(candidate.role) === 'Employee' || candidate.uid === role.assignedUserUid;

    if (!matchesDepartment || !matchesSubDepartment || !isEligibleEmployee) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Selected user is not an eligible employee for this role scope' });
    }

    if (role.assignedUserUid && role.assignedUserUid !== candidate.uid) {
      const previousAdmin = await User.findByPk(role.assignedUserUid, { transaction });
      if (previousAdmin) {
        await previousAdmin.update({
          role: 'Employee',
          deptId: role.scopeDepartmentId,
          subDepartment: role.scopeType === 'sub_department' ? role.scopeSubDepartment : previousAdmin.subDepartment,
          status: 'active'
        }, { transaction });
      }
    }

    await candidate.update({
      role: role.name,
      deptId: role.scopeDepartmentId,
      subDepartment: role.scopeType === 'sub_department' ? normalizeSubDepartmentName(role.scopeSubDepartment) : candidate.subDepartment,
      status: 'active'
    }, { transaction });

    await role.update({
      assignedUserUid: candidate.uid,
      status: 'active'
    }, { transaction });

    if (role.scopeType === 'core_department') {
      await Department.update(
        { adminId: candidate.uid, status: 'active' },
        { where: { id: role.scopeDepartmentId }, transaction }
      );
    }

    if (role.scopeType === 'sub_department') {
      const subDepartment = await Department.findOne({
        where: { type: 'sub-departments', name: normalizeSubDepartmentName(role.scopeSubDepartment), parentId: role.scopeDepartmentId },
        transaction
      });
      if (subDepartment) {
        await subDepartment.update({ adminId: candidate.uid, status: 'active' }, { transaction });
      }
    }

    await AuditLog.create({
      userId: req.user.uid,
      action: 'ROLE_ADMIN_ASSIGNED',
      entity: 'Role',
      module: 'ORG_ADMIN',
      after: { roleId: role.id, roleName: role.name, assignedUserUid: candidate.uid },
      timestamp: new Date()
    }, { transaction });

    await transaction.commit();
    res.json({
      message: 'Administrative role assigned successfully',
      adminPanelPassword: role.devRolePassword || null
    });
  } catch (error) {
    if (transaction && !transaction.finished) await transaction.rollback();
    console.error('Assign admin role error:', error);
    res.status(500).json({ error: 'Failed to assign admin role' });
  }
});

router.post('/departments/:id/deactivate', verifyToken, isRoleMappingManager, async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const department = await Department.findByPk(req.params.id, { transaction });
    if (!department) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Department not found' });
    }

    const impactedDepartments = [department];
    if (department.type === 'departments') {
      const children = await Department.findAll({
        where: { parentId: department.id, type: 'sub-departments' },
        transaction
      });
      impactedDepartments.push(...children);
    }

    for (const dept of impactedDepartments) {
      await dept.update({ status: 'inactive' }, { transaction });
    }

    const impactedRoleWhere = department.type === 'sub-departments'
      ? { scopeType: 'sub_department', scopeSubDepartment: department.name, isSeeded: true }
      : {
          [Op.or]: [
            { scopeDepartmentId: department.id, isSeeded: true },
            { scopeType: 'sub_department', scopeDepartmentId: department.id, isSeeded: true }
          ]
        };

    const roles = await Role.findAll({ where: impactedRoleWhere, transaction });
    const assignedUserUids = roles.map((role) => role.assignedUserUid).filter(Boolean);

    await Role.update({ status: 'inactive' }, { where: impactedRoleWhere, transaction });

    if (assignedUserUids.length > 0) {
      await User.update({ status: 'inactive' }, { where: { uid: assignedUserUids }, transaction });
    }

    const employeeWhere = department.type === 'sub-departments'
      ? { deptId: department.parentId, subDepartment: { [Op.in]: [department.name, normalizeSubDepartmentName(department.name)] } }
      : { deptId: department.id };

    await User.update({ status: 'inactive' }, { where: employeeWhere, transaction });

    await AuditLog.create({
      userId: req.user.uid,
      action: 'DEPARTMENT_DEACTIVATED',
      entity: 'Department',
      module: 'ORG_ADMIN',
      after: { departmentId: department.id, departmentName: department.name },
      timestamp: new Date()
    }, { transaction });

    await transaction.commit();
    res.json({ message: 'Department and associated governance chain deactivated successfully' });
  } catch (error) {
    if (transaction && !transaction.finished) await transaction.rollback();
    console.error('Deactivate department error:', error);
    res.status(500).json({ error: 'Failed to deactivate department hierarchy' });
  }
});

router.post('/roles', verifyToken, isOrgAdmin, async (req, res) => {
  try {
    const { name, description, isCustom, isAdminEligible, password } = req.body;
    
    if (!name) return res.status(400).json({ error: 'Role name is mandatory' });
    
    // Check for duplicate (Case-Insensitive)
    const normalizedTargetName = name.trim().toLowerCase();
    const existing = await Role.findOne({ 
      where: sequelize.where(sequelize.fn('LOWER', sequelize.col('name')), normalizedTargetName)
    });
    if (existing) return res.status(400).json({ error: 'Role identifier already exists' });

    // Auto-generate Unique Role ID
    const roleId = `ROLE-${Date.now().toString().slice(-6)}`;
    
    // Hash password if provided
    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const role = await Role.create({ 
      name, 
      description, 
      roleId,
      rolePassword: hashedPassword,
      isCustom: isCustom !== undefined ? isCustom : true,
      isAdminEligible: isAdminEligible || false
    });

    // Notify HR Administrators (GAP-5 Compliance Awareness)
    try {
      const hrUsers = await User.findAll({ where: { role: 'HR Admin' } });
      if (hrUsers.length > 0) {
        const notificationPayloads = hrUsers.map(hr => ({
          userUid: hr.uid,
          panelScope: 'hr admin',
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

router.get('/verified-admins', verifyToken, isOrgAdmin, async (req, res) => {
  try {
    // Fetch all roles eligible for administration
    const adminRoles = await Role.findAll({
      where: { isAdminEligible: true },
      attributes: ['name', 'description']
    });

    // Fetch all active users with these roles
    const activeAdmins = await User.findAll({
      where: { 
        status: 'active',
        role: { [Op.in]: adminRoles.map(r => r.name) }
      },
      attributes: ['uid', 'name', 'email', 'role'],
    });

    // Map roles to their current occupant or vacancy fallback
    const displayAdmins = adminRoles.map(role => {
      const occupant = activeAdmins.find(u => u.role === role.name);
      if (occupant) {
        return {
          uid: occupant.uid,
          name: occupant.name || role.name,
          email: occupant.email,
          role: role.name,
          isVacant: false
        };
      }
      return {
        uid: `VACANT-${role.name.toUpperCase().replace(/\s+/g, '-')}`,
        name: role.name, // Fallback to role name as requested
        email: 'Institutional Vacancy',
        role: role.name,
        isVacant: true
      };
    });

    res.json(displayAdmins);
  } catch (error) {
    console.error('Fetch Verified Admins Error:', error);
    res.status(500).json({ error: 'Failed to fetch verified institutional administrators' });
  }
});

router.get('/admin-credentials', verifyToken, isPrimaryOrgAdmin, async (req, res) => {
  try {
    const adminRoles = await Role.findAll({
      where: { isAdminEligible: true },
      attributes: ['name']
    });

    const normalizedAdminRoles = new Set(
      adminRoles.map((role) => normalizeInstitutionRoleName(role.name)?.toLowerCase()?.trim()).filter(Boolean)
    );

    normalizedAdminRoles.add('organization admin');
    normalizedAdminRoles.add('ceo');

    const users = await User.findAll({
      where: { status: 'active' },
      attributes: ['uid', 'name', 'email', 'role', 'status', 'createdAt'],
      order: [['name', 'ASC']]
    });

    const adminUsers = users
      .filter((user) => {
        const normalizedRole = normalizeInstitutionRoleName(user.role)?.toLowerCase()?.trim();
        return normalizedRole && normalizedAdminRoles.has(normalizedRole);
      })
      .map((user) => ({
        uid: user.uid,
        name: user.name,
        email: user.email,
        role: normalizeInstitutionRoleName(user.role),
        status: user.status,
        createdAt: user.createdAt
      }));

    res.json(adminUsers);
  } catch (error) {
    console.error('Fetch Admin Credentials List Error:', error);
    res.status(500).json({ error: 'Failed to fetch admin credentials list' });
  }
});

router.get('/admin-credentials/:uid', verifyToken, isPrimaryOrgAdmin, async (req, res) => {
  try {
    const adminRoles = await Role.findAll({
      where: { isAdminEligible: true },
      attributes: ['name']
    });

    const normalizedAdminRoles = new Set(
      adminRoles.map((role) => normalizeInstitutionRoleName(role.name)?.toLowerCase()?.trim()).filter(Boolean)
    );

    normalizedAdminRoles.add('organization admin');
    normalizedAdminRoles.add('ceo');

    const user = await User.findByPk(req.params.uid, {
      attributes: ['uid', 'name', 'email', 'role', 'status', 'devPassword', 'createdAt'],
      include: [
        {
          model: Role,
          as: 'assignedAdminRoles',
          attributes: ['id', 'name', 'devRolePassword'],
          required: false
        }
      ]
    });

    if (!user) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    const normalizedRole = normalizeInstitutionRoleName(user.role)?.toLowerCase()?.trim();
    if (!normalizedRole || !normalizedAdminRoles.has(normalizedRole)) {
      return res.status(404).json({ error: 'Admin credentials not available for this user' });
    }

    const directRole = await Role.findOne({
      where: { name: normalizeInstitutionRoleName(user.role) },
      attributes: ['name', 'devRolePassword']
    });

    const ceoPanel = await CEOPanel.findOne({
      where: { userId: user.uid },
      attributes: ['id', 'devCredential', 'status']
    });

    const mappedRolePassword = Array.isArray(user.assignedAdminRoles)
      ? user.assignedAdminRoles.find((role) => role?.devRolePassword)?.devRolePassword || ''
      : '';

    const resolvedPassword =
      ceoPanel?.devCredential ||
      mappedRolePassword ||
      directRole?.devRolePassword ||
      user.devPassword ||
      'password123';

    await AuditLog.create({
      userId: req.user.uid,
      action: 'ADMIN_CREDENTIAL_VIEW',
      entity: `User:${user.uid}`,
      module: 'ORG_ADMIN',
      remarks: `Viewed stored admin credentials for ${user.name || user.uid}`,
      ipAddress: req.ip || '0.0.0.0',
      timestamp: new Date()
    });

    res.json({
      uid: user.uid,
      name: user.name,
      email: user.email,
      role: normalizeInstitutionRoleName(user.role),
      status: user.status,
      password: resolvedPassword,
      hasStoredPassword: Boolean(resolvedPassword),
      createdAt: user.createdAt
    });
  } catch (error) {
    console.error('Reveal Admin Credentials Error:', error);
    res.status(500).json({ error: 'Failed to reveal admin credentials' });
  }
});

router.put('/admin-credentials/:uid/password', verifyToken, isPrimaryOrgAdmin, async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { password } = req.body;
    if (!password || password.length < 6) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const adminRoles = await Role.findAll({
      where: { isAdminEligible: true },
      attributes: ['name']
    });

    const normalizedAdminRoles = new Set(
      adminRoles.map((role) => normalizeInstitutionRoleName(role.name)?.toLowerCase()?.trim()).filter(Boolean)
    );

    normalizedAdminRoles.add('organization admin');
    normalizedAdminRoles.add('ceo');

    const user = await User.findByPk(req.params.uid, {
      include: [{ model: Role, as: 'assignedAdminRoles', required: false }]
    });

    if (!user) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Admin not found' });
    }

    const normalizedRole = normalizeInstitutionRoleName(user.role)?.toLowerCase()?.trim();
    if (!normalizedRole || !normalizedAdminRoles.has(normalizedRole)) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Admin credentials not available' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Update main user record
    await user.update({ 
      password: hashedPassword, 
      devPassword: password 
    }, { transaction });

    // Update ceo panel if exists
    const ceoPanel = await CEOPanel.findOne({ where: { userId: user.uid } });
    if (ceoPanel) {
      await ceoPanel.update({ devCredential: password }, { transaction });
    }

    // Update mapped role if exists
    if (Array.isArray(user.assignedAdminRoles)) {
      for (const role of user.assignedAdminRoles) {
        if (role.devRolePassword) {
          await role.update({ devRolePassword: password, rolePassword: hashedPassword }, { transaction });
        }
      }
    }

    // Update direct legacy role matching exact name if it exists and had a seeded password natively hooked there
    const directRole = await Role.findOne({ where: { name: normalizeInstitutionRoleName(user.role) } });
    if (directRole && directRole.devRolePassword) {
      await directRole.update({ devRolePassword: password, rolePassword: hashedPassword }, { transaction });
    }

    await AuditLog.create({
      userId: req.user.uid,
      action: 'ADMIN_CREDENTIAL_UPDATE',
      entity: `User:${user.uid}`,
      module: 'ORG_ADMIN',
      remarks: `Modified seeded panel credentials for ${user.name || user.uid}`,
      ipAddress: req.ip || '0.0.0.0',
      timestamp: new Date()
    }, { transaction });

    await transaction.commit();
    res.json({ success: true, message: 'Admin credentials updated successfully' });
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error('Update Admin Credentials Error:', error);
    res.status(500).json({ error: 'Failed to update admin credentials' });
  }
});


// GET /alerts - High Fidelity System Governance
router.get('/alerts', verifyToken, isOrgAdmin, async (req, res) => {
  try {
    const alerts = [];

    // 1. Escalated Tasks (Overdue)
    const overdueTasksRaw = await Task.findAll({
      where: {
        status: { [Op.ne]: 'completed' },
        deadline: { [Op.lt]: new Date() }
      },
      include: [
        { 
          model: User, 
          as: 'assignee', 
          attributes: ['name', 'deptId'], 
          required: false,
          include: [{ model: Department, as: 'department', attributes: ['name'], required: false }]
        },
        { model: User, as: 'assigner', attributes: ['name'], required: false }
      ],
      order: [['deadline', 'ASC']]
    });

    const overdueTasks = augmentTaskCollection(overdueTasksRaw);

    overdueTasks.forEach(task => {
      const daysOverdue = Math.floor((new Date() - new Date(task.deadline)) / (1000 * 60 * 60 * 24));
      const assigneeDisplay = task.assignee?.name || 'Unassigned';
      alerts.push({
        id: `task-${task.id}`,
        type: 'Escalated Task',
        title: task.title,
        department: task.assignee?.department?.name || 'Institutional',
        overdue: `${task.isEscalated ? Math.max(1, daysOverdue) : daysOverdue} Days`,
        chain: `${task.assigner?.name || 'System'} → ${assigneeDisplay}`,
        assignerName: task.assigner?.name || 'System',
        assigneeName: assigneeDisplay,
        assignedDate: task.createdAt,
        dueDate: task.deadline,
        details: task.description || "Active task has exceeded its institutional deadline and requires immediate intervention.",
        actionLabel: 'View Task',
        actionLink: '/dashboard/org-admin/overview', 
        source: 'Task'
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
    const { status, description, isAdminEligible } = req.body;
    const role = await Role.findByPk(id);
    
    if (!role) return res.status(404).json({ error: 'Role not found' });
    
    // Strict Governance: Prevent modification of system roles at the API level
    if (!role.isCustom) {
      return res.status(403).json({ error: 'System roles are structurally immutable and cannot be reconfigured or deactivated.' });
    }

    await role.update({ status, description, isAdminEligible });
    res.json(role);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update role configuration' });
  }
});

router.delete('/roles/:id', verifyToken, isOrgAdmin, async (req, res) => {
  let transaction;
  try {
    transaction = await sequelize.transaction();
    const { id } = req.params;
    const role = await Role.findByPk(id, { transaction });
    
    if (!role) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Role not found' });
    }
    
    if (!role.isCustom) {
      await transaction.rollback();
      return res.status(403).json({ error: 'System roles cannot be deleted.' });
    }

    const usersWithRole = await User.count({ where: { role: role.name }, transaction });
    if (usersWithRole > 0) {
      await transaction.rollback();
      return res.status(409).json({ error: 'Cannot delete role assigned to active users.' });
    }

    const originalName = role.name;
    await role.destroy({ transaction });
    
    await Permission.destroy({ where: { role: originalName }, transaction });
    await RolePermissionShadow.destroy({ where: { roleName: originalName }, transaction });

    const currentConfig = await OrgConfig.findOne({ where: { key: 'GLOBAL_PERMISSION_MATRIX' }, transaction });
    if (currentConfig) {
      const configVal = currentConfig.value;
      if (configVal && configVal.matrix && configVal.matrix[originalName]) {
        delete configVal.matrix[originalName];
        await currentConfig.update({ value: configVal }, { transaction });
        clearMatrixCache();
      }
    }

    await AuditLog.create({
      userId: req.user.uid,
      action: 'ROLE_DELETED',
      entity: `Role: ${originalName}`,
      module: 'GOVERNANCE',
      remarks: 'Permanently deleted custom institutional role and removed from global matrix.',
      timestamp: new Date()
    }, { transaction });

    await transaction.commit();
    res.json({ message: 'Role deleted successfully' });
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error('Delete Role Error:', error);
    res.status(500).json({ error: 'Failed to delete role' });
  }
});

router.put('/roles/:id/audit', verifyToken, isOrgAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { isAudited } = req.body;
    const role = await Role.findByPk(id);
    
    if (!role) return res.status(404).json({ error: 'Role not found' });
    
    const before = { isAudited: role.isAudited };
    await role.update({ isAudited });
    
    await AuditLog.create({
      entity: `Role: ${role.name}`,
      action: isAudited ? 'ROLE_VERIFIED' : 'ROLE_AUDIT_REVOKED',
      userId: req.user.uid,
      module: 'GOVERNANCE',
      before: before,
      after: { isAudited },
      remarks: isAudited 
        ? `Manual verification completed for role: ${role.name}` 
        : `Verification revoked for role: ${role.name}`
    });

    res.json(role);
  } catch (error) {
    console.error('Audit Role Error:', error);
    res.status(500).json({ error: 'Failed to verify role' });
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
    
    // Strict Governance: Prevent matrix-level overrides for system roles
    const roleRecord = await Role.findOne({ where: { name: role } });
    if (roleRecord && !roleRecord.isCustom) {
      return res.status(403).json({ error: 'Institutional system roles are structurally immutable at the permission level.' });
    }
    
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

// [NEW] GET /permissions/matrix/full - Retrieve action-level centralized matrix
router.get('/permissions/matrix/full', verifyToken, isOrgAdmin, async (req, res) => {
  try {
    const config = await OrgConfig.findOne({ where: { key: 'GLOBAL_PERMISSION_MATRIX' } });
    if (!config) {
      // Return empty structure if not initialized
      return res.json({ matrix: {} });
    }
    res.json(config.value);
  } catch (error) {
    console.error('[PERM_MATRIX] Fetch Full Error:', error);
    res.status(500).json({ error: 'Failed to retrieve granular permission matrix' });
  }
});

// [NEW] POST /permissions/matrix/update-full - Centralized matrix update with Versioning & Shadow Sync
router.post('/permissions/matrix/update-full', verifyToken, isOrgAdmin, async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { matrix, remarks } = req.body;
    
    // 1. Snapshot previous version if exists
    const currentConfig = await OrgConfig.findOne({ where: { key: 'GLOBAL_PERMISSION_MATRIX' } });
    if (currentConfig) {
      const lastVersion = await PermissionVersion.max('versionNumber') || 0;
      await PermissionVersion.create({
        versionNumber: lastVersion + 1,
        updatedBy: req.user.uid,
        snapshot: currentConfig.value.matrix,
        remarks: remarks || 'Institutional recalibration'
      }, { transaction });
    }

    // 2. Generate Granular Audit Logs (Done BEFORE saving to prevent memory mutation)
    const oldMatrix = currentConfig ? currentConfig.value.matrix : {};
    const auditLogsToCreate = [];

    for (const [roleName, actions] of Object.entries(matrix)) {
      for (const [actionId, newPerms] of Object.entries(actions)) {
        const oldPerms = oldMatrix[roleName]?.[actionId] || { create: false, read: false, update: false, delete: false, approve: false };
        
        const hasChanged = 
          Boolean(oldPerms.create) !== Boolean(newPerms.create) ||
          Boolean(oldPerms.read) !== Boolean(newPerms.read) ||
          Boolean(oldPerms.update) !== Boolean(newPerms.update) ||
          Boolean(oldPerms.delete) !== Boolean(newPerms.delete) ||
          Boolean(oldPerms.approve) !== Boolean(newPerms.approve);

        if (hasChanged) {
          auditLogsToCreate.push({
            userId: req.user.uid,
            action: 'PERMISSION_UPDATE',
            entity: `Role: ${roleName}`,
            module: 'GOVERNANCE',
            before: { read: Boolean(oldPerms.read), write: Boolean(oldPerms.update), approve: Boolean(oldPerms.approve) },
            after: { read: Boolean(newPerms.read), write: Boolean(newPerms.update), approve: Boolean(newPerms.approve) },
            remarks: `Updated ${actionId.charAt(0).toUpperCase() + actionId.slice(1).replace('-', ' ')} access for ${roleName}`,
            timestamp: new Date()
          });
        }
      }
    }
    
    if (auditLogsToCreate.length > 0) {
      await AuditLog.bulkCreate(auditLogsToCreate, { transaction });
    }

    // 3. Update Master JSON
    const [config, created] = await OrgConfig.findOrCreate({
      where: { key: 'GLOBAL_PERMISSION_MATRIX' },
      defaults: { 
        value: { matrix },
        group: 'governance'
      },
      transaction
    });

    if (!created) {
      await config.update({ value: { matrix } }, { transaction });
    }

    // 4. Synchronize Shadow Registry
    await RolePermissionShadow.destroy({ where: {}, transaction });
    const shadowRows = [];
    for (const [roleName, actions] of Object.entries(matrix)) {
      for (const [actionId, perms] of Object.entries(actions)) {
        shadowRows.push({
          roleName,
          actionId,
          create: perms.create || false,
          read: perms.read || false,
          update: perms.update || false,
          delete: perms.delete || false,
          approve: perms.approve || false,
          scope: perms.scope || 'SELF',
          ownership: perms.ownership || false
        });
      }
    }
    await RolePermissionShadow.bulkCreate(shadowRows, { transaction });

    // 4. Audit & Cache Invalidation (Global Checkpoint)
    await AuditLog.create({
      userId: req.user.uid,
      action: 'PERMISSION_MATRIX_RECONCILIATION',
      entity: 'OrgConfig: GLOBAL_PERMISSION_MATRIX',
      module: 'GOVERNANCE',
      remarks: remarks || 'Full action-level permission matrix recalibrated and synchronized with shadow registry.',
      timestamp: new Date()
    }, { transaction });

    await transaction.commit();
    clearMatrixCache();

    res.json({ success: true, message: 'Institutional governance synchronized and versioned.' });
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error('[PERM_MATRIX] Update Full Error:', error);
    res.status(500).json({ error: 'Failed to synchronize institutional permission matrix' });
  }
});

/**
 * [NEW] GET /permissions/history
 * Retrieve the audit trail of governance recalibrations.
 */
router.get('/permissions/history', verifyToken, isOrgAdmin, async (req, res) => {
  try {
    const versions = await PermissionVersion.findAll({
      order: [['versionNumber', 'DESC']],
      attributes: ['id', 'versionNumber', 'updatedBy', 'remarks', 'timestamp']
    });
    res.json(versions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve governance history' });
  }
});

/**
 * [NEW] GET /permissions/version/:id
 * Retrieve a specific snapshot from history.
 */
router.get('/permissions/version/:id', verifyToken, isOrgAdmin, async (req, res) => {
  try {
    const version = await PermissionVersion.findByPk(req.params.id);
    if (!version) return res.status(404).json({ error: 'Version not found' });
    res.json(version);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve version snapshot' });
  }
});

/**
 * [NEW] POST /permissions/rollback/:id
 * Institutional recovery to a previous governance state.
 */
router.post('/permissions/rollback/:id', verifyToken, isOrgAdmin, async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const version = await PermissionVersion.findByPk(req.params.id);
    if (!version) return res.status(404).json({ error: 'Version not found' });

    const matrix = version.snapshot;

    // Update Master JSON
    await OrgConfig.update(
      { value: { matrix } },
      { where: { key: 'GLOBAL_PERMISSION_MATRIX' }, transaction }
    );

    // Sync Shadow Registry
    await RolePermissionShadow.destroy({ where: {}, transaction });
    const shadowRows = [];
    for (const [roleName, actions] of Object.entries(matrix)) {
      for (const [actionId, perms] of Object.entries(actions)) {
        shadowRows.push({
          roleName,
          actionId,
          create: perms.create || false,
          read: perms.read || false,
          update: perms.update || false,
          delete: perms.delete || false,
          approve: perms.approve || false,
          scope: perms.scope || 'SELF',
          ownership: perms.ownership || false
        });
      }
    }
    await RolePermissionShadow.bulkCreate(shadowRows, { transaction });

    await AuditLog.create({
      userId: req.user.uid,
      action: 'PERMISSION_ROLLBACK',
      entity: 'OrgConfig: GLOBAL_PERMISSION_MATRIX',
      module: 'GOVERNANCE',
      remarks: `Emergency institutional rollback to Version [${version.versionNumber}] by Administrator.`,
      timestamp: new Date()
    }, { transaction });

    await transaction.commit();
    clearMatrixCache();

    res.json({ success: true, message: `Institutional governance rolled back to Version ${version.versionNumber}.` });
  } catch (error) {
    if (transaction) await transaction.rollback();
    res.status(500).json({ error: 'Rollback operation failed' });
  }
});

// [NEW] GET /audit/permissions - Retrieve governance trails
router.get('/audit/permissions', verifyToken, isOrgAdmin, async (req, res) => {
  try {
    const logs = await AuditLog.findAll({
      where: { 
        module: 'GOVERNANCE', 
        action: { [Op.in]: ['PERMISSION_UPDATE', 'PERMISSION_MATRIX_RECONCILIATION'] }
      },
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
      
      const isGlobal = log.action === 'PERMISSION_MATRIX_RECONCILIATION';

      return {
        id: log.id,
        user: log.userId,
        role: isGlobal ? 'GLOBAL MATRIX' : log.entity.replace('Role: ', ''),
        feature: isGlobal ? 'System Recalibration' : (log.remarks.includes('Updated ') ? log.remarks.split('Updated ')[1].split(' access')[0] : log.remarks),
        prev: isGlobal ? 'Previous Version Snapshot' : formatAccess(log.before),
        next: isGlobal ? 'New Action-Level Matrix' : formatAccess(log.after),
        time: new Date(log.timestamp).toLocaleString()
      };
    });

    res.json(formattedLogs);
  } catch (error) {
    console.error('Audit Retrieval Error:', error);
    res.status(500).json({ error: 'Failed to retrieve institutional audit trails' });
  }
});

// [NEW] GET /database/tables - Retrieve database registry
router.get('/database/tables', verifyToken, isOrgAdmin, async (req, res) => {
  try {
    const tableData = Object.keys(models).map(modelName => {
      const model = models[modelName];
      const attributes = Object.keys(model.rawAttributes || {});
      return {
        modelName,
        tableName: model.tableName,
        attributeCount: attributes.length,
        attributes: attributes
      };
    });
    
    // Sort alphabetically by modelName
    tableData.sort((a, b) => a.modelName.localeCompare(b.modelName));
    
    res.json(tableData);
  } catch (error) {
    console.error('Fetch Tables Error:', error);
    res.status(500).json({ error: 'Failed to retrieve database schema registry' });
  }
});

// [NEW] GET /hierarchy - Retrieve institutional hierarchical structure with strict nesting
router.get('/hierarchy', verifyToken, isOrgAdmin, async (req, res) => {
  try {
    const departments = await Department.findAll({
      where: {
        type: {
          [Op.or]: [
            { [Op.notIn]: ['branch', 'branches'] },
            { [Op.is]: null }
          ]
        }
      },
      include: [
        { model: User, as: 'admin', attributes: ['name', 'email'] }
      ]
    });

    // Create a lookup map for nesting
    const nodesMap = {};
    departments.forEach(dept => {
      nodesMap[dept.id] = {
        id: dept.id,
        name: dept.name,
        shortName: dept.shortName,
        type: dept.type,
        status: dept.status,
        parentId: dept.parentId,
        adminName: dept.admin?.name || 'Unassigned',
        adminEmail: dept.admin?.email || '',
        createdAt: dept.createdAt,
        children: []
      };
    });

    const hierarchy = {
      institution: [],
      branches: [],
      departments: [],
      studyCenters: [],
      programs: []
    };

    // Build the tree
    Object.values(nodesMap).forEach(node => {
      if (node.parentId && nodesMap[node.parentId]) {
        nodesMap[node.parentId].children.push(node);
      } else {
        const t = node.type?.toLowerCase();
        if (t === 'university') hierarchy.institution.push(node);
        else if (t === 'branches') hierarchy.branches.push(node);
        else if (t === 'partner-center') hierarchy.studyCenters.push(node);
        else hierarchy.departments.push(node); 
      }
    });

    // Fetch Programs
    const programsData = await Program.findAll();
    programsData.forEach(prog => {
      hierarchy.programs.push({
        id: prog.id,
        name: prog.name,
        shortName: prog.shortName,
        type: 'program',
        status: prog.status,
        adminName: 'Academic Board',
        adminEmail: 'academic@iits.tech',
        createdAt: prog.createdAt,
        children: []
      });
    });

    res.json(hierarchy);
  } catch (error) {
    console.error('Fetch Hierarchy Error:', error);
    res.status(500).json({ error: 'Failed to retrieve institutional hierarchy' });
  }
});

// [NEW] POST /initialize-topology - Bootstrap the institutional root (Internal University)
router.post('/initialize-topology', verifyToken, isOrgAdmin, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    // 1. Check if ANY university already exists
    const existingUni = await Department.findOne({
      where: { type: 'universities' },
      transaction: t
    });

    if (existingUni) {
      await t.rollback();
      return res.status(400).json({ error: 'Institutional topology is already initialized.' });
    }

    // 2. Identify a suitable admin for the university (default to the current user if no specific one)
    const admin = await User.findOne({
      where: { role: 'Organization Admin' },
      transaction: t
    });

    // 3. Create the Internal University node
    const university = await Department.create({
      name: 'IITS Internal University',
      shortName: 'IIU',
      type: 'universities',
      status: 'active',
      adminId: admin ? admin.uid : req.user.uid,
      centerStatus: 'ACTIVE'
    }, { transaction: t });

    await AuditLog.create({
      userId: req.user.uid,
      action: 'INITIALIZE_TOPOLOGY',
      entity: `Department: ${university.id}`,
      module: 'GOVERNANCE',
      remarks: 'Primary institutional university node bootstrapped via hierarchy initialization wizard.',
      timestamp: new Date()
    }, { transaction: t });

    await t.commit();
    res.json({ 
      success: true, 
      message: 'Institutional topology successfully initialized.',
      data: university 
    });
  } catch (error) {
    await t.rollback();
    console.error('Initialize Topology Error:', error);
    res.status(500).json({ error: 'Failed to bootstrap institutional metadata' });
  }
});

router.get('/roles/hierarchy', verifyToken, isOrgAdmin, async (req, res) => {
  try {
    const roles = await Role.findAll();
    const userRoleCounts = await User.findAll({
      attributes: ['role', [sequelize.fn('COUNT', sequelize.col('uid')), 'count']],
      group: ['role']
    });

    const representativeUsers = await User.findAll({
      attributes: ['role', 'email'],
      order: [['uid', 'ASC']] // Get the earliest user as primary
    });

    const roleToCount = {};
    userRoleCounts.forEach(u => {
      roleToCount[u.role] = parseInt(u.dataValues.count) || 0;
    });

    const roleToEmail = {};
    representativeUsers.forEach(u => {
      if (!roleToEmail[u.role]) roleToEmail[u.role] = u.email;
    });

    const tiers = [
      { id: 'governance', name: 'Board of Governance', color: 'indigo', roles: [] },
      { id: 'executive', name: 'Executive Leadership', color: 'blue', roles: [] },
      { id: 'pillars', name: 'Functional Pillar Administrators', color: 'emerald', roles: [] },
      { id: 'units', name: 'Sub-Department Managers', color: 'amber', roles: [] },
      { id: 'partners', name: 'Regional Institutional Partners', color: 'rose', roles: [] },
      { id: 'workforce', name: 'Operational Workforce', color: 'slate', roles: [] },
      { id: 'stakeholders', name: 'Service Consumers', color: 'violet', roles: [] }
    ];

    const getTierId = (name) => {
      const n = name.toLowerCase();
      if (n.includes('admin') && n.includes('organization')) return 'governance';
      if (n === 'ceo') return 'executive';
      if (n.includes('admin') && (n.includes('finance') || n.includes('hr') || n.includes('ops') || n.includes('academic') || n.includes('sales'))) return 'pillars';
      if (n.includes('admin') && (n.includes('school') || n.includes('department') || n.includes('unit') || n.includes('sub_dept'))) return 'units';
      if (n === 'center' || n === 'study-center' || n === 'study center' || n === 'partner center') return 'partners';
      if (n === 'employee' || n === 'staff') return 'workforce';
      if (n === 'student') return 'stakeholders';
      return 'workforce'; // Default to workforce
    };

    roles.forEach(role => {
      const tierId = getTierId(role.name);
      const tier = tiers.find(t => t.id === tierId);
      if (tier) {
        tier.roles.push({
          id: role.id,
          name: role.name,
          description: role.description,
          count: roleToCount[role.name] || 0,
          status: role.status,
          createdAt: role.createdAt,
          isCustom: role.isCustom,
          isAdminEligible: role.isAdminEligible,
          isAudited: role.isAudited,
          representativeEmail: roleToEmail[role.name] || 'system@erp.com',
          isConflict: SINGLETON_ROLES.some(s => s.toLowerCase() === role.name.toLowerCase()) && (roleToCount[role.name] || 0) > 1
        });
      }
    });

    // Handle hardcoded roles if not in Role table but present in Users
    const hardcodedRoles = ['Organization Admin', 'CEO', 'Operations Admin', 'Finance Admin', 'HR Admin', 'Sales & CRM Admin', 'student', 'Employee', 'Partner Center'];
    hardcodedRoles.forEach(h => {
      const alreadyIn = tiers.some(t => t.roles.some(r => r.name.toLowerCase() === h.toLowerCase()));
      if (!alreadyIn) {
        const tierId = getTierId(h);
        const tier = tiers.find(t => t.id === tierId);
        if (tier) {
          tier.roles.push({
            id: `hardcoded-${h}`,
            name: h,
            description: `System defined ${h} role.`,
            count: roleToCount[h] || 0,
            status: 'active',
            createdAt: new Date(),
            isCustom: false,
            isAdminEligible: h.toLowerCase().includes('admin') || h === 'CEO',
            isAudited: true,
            representativeEmail: roleToEmail[h] || `admin.${h.toLowerCase().replace(/[^a-z]/g, '')}@erp.com`,
            isConflict: SINGLETON_ROLES.some(s => s.toLowerCase() === h.toLowerCase()) && (roleToCount[h] || 0) > 1
          });
        }
      }
    });

    res.json(tiers);
  } catch (error) {
    console.error('Fetch Role Hierarchy Error:', error);
    res.status(500).json({ error: 'Failed to retrieve role hierarchy' });
  }
});

export default router;
