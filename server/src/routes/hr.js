
import { applyExecutiveScope } from '../middleware/visibility.js';
import express from 'express';
import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { models, sequelize } from '../models/index.js';
import { verifyToken, roleGuard } from '../middleware/verifyToken.js';
import { createNotification } from './notifications.js';
import { checkPermission, checkPermissionOrRole, enforceApprovalChain } from '../middleware/rbac.js';
import { normalizeInstitutionRoleName, normalizeSubDepartmentName, SEEDED_ADMIN_ROLE_NAMES } from '../config/institutionalStructure.js';

import { logAction } from '../lib/audit.js';
import { handleAuthoritySuccession } from '../utils/governance/singletonEnforcement.js';
import { validateTaskAssignment } from '../utils/rbac/validateTaskAssignment.js';

const router = express.Router();
const { User, Vacancy, Task, Department, Leave, Attendance, Lead, Referral, AuditLog, ReregRequest, Role, EmployeeHRRequest } = models;

const isHR = roleGuard(['HR Admin', 'Organization Admin', 'ceo', 'hr']);

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(process.cwd(), 'uploads', 'avatars');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const seed = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `hr-employee-${seed}${path.extname(file.originalname)}`);
  }
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'));
    }
  }
});

const buildAvatarUrl = (req, file) => {
  if (!file) return null;
  const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
  return `${baseUrl}/uploads/avatars/${file.filename}`;
};

const resolveDepartmentScope = async (departmentId, transaction) => {
  if (!departmentId) {
    return { deptId: null, subDepartment: null };
  }

  const department = await Department.findByPk(departmentId, { transaction });
  if (!department) {
    return { deptId: departmentId, subDepartment: null };
  }

  const type = department.type?.toLowerCase() || '';
  if (type.startsWith('sub-')) {
    return {
      deptId: department.parentId,
      subDepartment: normalizeSubDepartmentName(department.name)
    };
  }

  return {
    deptId: department.id,
    subDepartment: normalizeSubDepartmentName(department.name) === department.name ? null : normalizeSubDepartmentName(department.name)
  };
};

const resolveVacancyScope = async (vacancy, transaction) => {
  const resolved = await resolveDepartmentScope(vacancy.departmentId, transaction);
  return {
    deptId: resolved.deptId,
    subDepartment: resolved.subDepartment || normalizeSubDepartmentName(vacancy.subDepartment || 'General')
  };
};

const clearSeededAdminAssignment = async (user, transaction, actorUid) => {
  const assignedRoles = await Role.findAll({
    where: {
      assignedUserUid: user.uid,
      isSeeded: true
    },
    transaction
  });

  if (assignedRoles.length === 0) {
    return false;
  }

  for (const role of assignedRoles) {
    await role.update({ assignedUserUid: null }, { transaction });

    if (role.scopeType === 'core_department' && role.scopeDepartmentId) {
      await Department.update(
        { adminId: null },
        {
          where: {
            id: role.scopeDepartmentId,
            adminId: user.uid
          },
          transaction
        }
      );
    }

    if (role.scopeType === 'sub_department' && role.scopeDepartmentId && role.scopeSubDepartment) {
      await Department.update(
        { adminId: null },
        {
          where: {
            type: 'sub-departments',
            parentId: role.scopeDepartmentId,
            name: normalizeSubDepartmentName(role.scopeSubDepartment),
            adminId: user.uid
          },
          transaction
        }
      );
    }

    await AuditLog.create({
      userId: actorUid || user.uid,
      action: 'ROLE_ADMIN_REMOVED_ON_REMAP',
      entity: 'Role',
      module: 'HR',
      before: { roleId: role.id, roleName: role.name, assignedUserUid: user.uid },
      after: { roleId: role.id, roleName: role.name, assignedUserUid: null },
      timestamp: new Date()
    }, { transaction });
  }

  return true;
};

// Shared governance enforces singleton rules based on config/rbac.js

// Step 9: Logging Middleware
router.use((req, res, next) => {
    console.log("HR API HIT:", req.url);
    next();
});

// Step 7: FIX STATS API
router.get('/stats', verifyToken, isHR, applyExecutiveScope, async (req, res) => {
  try {
    const { userFilter = {}, vacancyFilter = {} } = req.visibility || {};
    const workforceFilter = {
      status: 'active',
      vacancyId: { [Op.not]: null }, 
      ...userFilter
    };

    const [employeeCount, vacancyCount, pendingLeaves, activeTasks] = await Promise.all([
      User.count({ where: workforceFilter }),
      Vacancy.count({ where: { status: 'OPEN', ...vacancyFilter } }),
      Leave.count({ 
        where: { status: 'pending hr' },
        include: [{ model: User, as: 'employee', where: userFilter, required: true }]
      }),
      Task.count({ 
        where: { status: 'pending' },
        include: [{ model: User, as: 'assignee', where: userFilter, required: true }]
      })
    ]);
    
    // Explicitly cast to Number to avoid UI rendering issues with strings or nested objects
    const data = {
      employeeCount: Number(employeeCount) || 0,
      vacancyCount: Number(vacancyCount) || 0,
      pendingLeaves: Number(pendingLeaves) || 0,
      activeTasks: Number(activeTasks) || 0
    };

    console.log('[HR-STATS-DEBUG]:', data);
    res.json(data);
  } catch (error) {
    console.error("HR API ERROR:", error);
    res.status(500).json({ message: "Internal server error", module: "HR" });
  }
});

// Step 6: FIX VACANCIES API
router.get('/vacancies', verifyToken, applyExecutiveScope, async (req, res) => {
  try {
    const { vacancyFilter = {} } = req.visibility || {};
    const vacancies = await Vacancy.findAll({
      where: vacancyFilter,
      include: [{ 
        model: Department, 
        as: 'department', 
        attributes: ['name', 'type'],
        required: false,
        include: [{ 
          model: Department, 
          as: 'parent', 
          attributes: ['name'],
          required: false
        }]
      }],
      order: [['createdAt', 'DESC']]
    });
    res.json(vacancies);
  } catch (error) {
    // Forensic Logging
    const fs = await import('fs');
    const logMsg = `[HR-VACANCIES-FETCH-ERROR] ${new Date().toISOString()}: ${error.message}\n` +
                 `Stack: ${error.stack}\n---\n`;
    fs.appendFileSync('rbac_debug.log', logMsg);
    console.error("HR API ERROR (Vacancies):", error);
    res.status(500).json({ message: "Internal server error", module: "HR", details: error.message });
  }
});

router.post('/vacancies', verifyToken, isHR, async (req, res) => {
  try {
    const { title, departmentId, subDepartment, count, requirements } = req.body;
    
    if (!title || !departmentId) {
      return res.status(400).json({ message: "Invalid payload: title and departmentId required", module: "HR" });
    }

    const vacancy = await Vacancy.create({
      title,
      departmentId,
      subDepartment: subDepartment || 'General',
      count: count || 1,
      requirements,
      status: 'OPEN'
    });
    res.status(201).json(vacancy);
  } catch (error) {
    console.error("HR API ERROR:", error);
    res.status(500).json({ message: "Internal server error", module: "HR" });
  }
});

// Step 4: FIX DATABASE QUERIES (Employees)
router.get('/employees', verifyToken, isHR, applyExecutiveScope, async (req, res) => {
  try {
    const { filter: visibilityFilter } = req.visibility;
    const employees = await User.findAll({
      where: visibilityFilter, 
      attributes: { exclude: ['password'] },
      include: [
        { model: Department, as: 'department', attributes: ['name'], required: false },
        { model: User, as: 'manager', attributes: ['name', 'uid'], required: false },
        { model: Role, as: 'assignedAdminRoles', attributes: ['id', 'name', 'scopeType', 'scopeSubDepartment'], required: false }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(employees);
  } catch (error) {
    // Forensic Logging
    const fs = await import('fs');
    const logMsg = `[HR-EMPLOYEES-FETCH-ERROR] ${new Date().toISOString()}: ${error.message}\n` +
                 `Stack: ${error.stack}\n---\n`;
    fs.appendFileSync('rbac_debug.log', logMsg);
    console.error("HR API ERROR (Employees):", error);
    res.status(500).json({ message: "Internal server error", module: "HR", details: error.message });
  }
});

router.post('/employees', verifyToken, isHR, avatarUpload.single('avatar'), async (req, res) => {
  let t;
  try {
    const { vacancyId, email, password, name, reportingManagerUid } = req.body;

    t = await sequelize.transaction();

    if (!vacancyId || !email || !password || !name) {
      await t.rollback();
      return res.status(400).json({ 
        error: "Invalid payload: email, password, name and vacancyId required", 
        module: "HR" 
      });
    }

    const vacancy = await Vacancy.findByPk(vacancyId, { transaction: t });
    if (!vacancy || vacancy.status !== 'OPEN' || vacancy.filledCount >= vacancy.count) {
      await t.rollback();
      return res.status(400).json({ message: "Selected vacancy is invalid or already filled.", module: "HR" });
    }

    const resolvedScope = await resolveVacancyScope(vacancy, t);

    const hashedPassword = await bcrypt.hash(password, 10);
    const generatedUid = `EMP-${Date.now().toString().slice(-6)}`;

    // [FIX] Hardening: Verify manager existence to prevent FK constraint failures/500 errors
    let finalizedManagerUid = reportingManagerUid || null;
    if (finalizedManagerUid) {
      const managerExists = await User.count({ where: { uid: finalizedManagerUid }, transaction: t });
      if (!managerExists) {
        console.warn(`[HR-REG] Invalid reportingManagerUid provided: ${finalizedManagerUid}. Reverting to NULL.`);
        finalizedManagerUid = null;
      }
    }

    const newUser = await User.create({
      uid: generatedUid,
      email,
      password: hashedPassword,
      role: 'Employee',
      name,
      deptId: resolvedScope.deptId,
      subDepartment: resolvedScope.subDepartment, // Inheritance from vacancy structure
      reportingManagerUid: finalizedManagerUid,
      vacancyId,
      status: 'active',
      devPassword: password,
      avatar: buildAvatarUrl(req, req.file)
    }, { transaction: t });

    vacancy.filledCount += 1;
    if (vacancy.filledCount >= vacancy.count) {
      vacancy.status = 'CLOSED';
    }
    await vacancy.save({ transaction: t });

    // Handle Authority Succession if the new user is active
    if (newUser.status === 'active') {
      await handleAuthoritySuccession(models, newUser.role, newUser.uid, t, req.user.uid);
    }

    await t.commit();
    res.status(201).json({ uid: newUser.uid, name: newUser.name });
  } catch (error) {
    if (t) await t.rollback();
    console.error("[HR-REG] Critical Failure:", error);

    // [FIX] Specific Error Handling to prevent generic 500s
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ 
        error: "A record with this email already exists.", 
        details: error.errors?.map(e => e.message),
        module: "HR" 
      });
    }

    if (error.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(400).json({ 
        error: "Referential integrity failure: Selected vacancy or manager is invalid.", 
        module: "HR" 
      });
    }

    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ 
        error: "Registry validation failure.", 
        details: error.errors?.map(e => e.message),
        module: "HR" 
      });
    }

    res.status(500).json({ 
      error: error.message || "Institutional registration protocol failure", 
      type: error.name,
      module: "HR" 
    });
  }
});
router.post('/employees/onboard', verifyToken, isHR, async (req, res) => {
  try {
    const { email, password, name, departmentId, subDepartment, reportingManagerUid } = req.body;

    if (!email || !password || !name || !departmentId) {
      return res.status(400).json({ message: "Invalid payload: email, password, name, and departmentId required", module: "HR" });
    }

    // Check if user already exists
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ message: "An employee with this email already exists.", module: "HR" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const generatedUid = `EMP-${Date.now().toString().slice(-6)}`;
    const resolvedScope = await resolveDepartmentScope(departmentId);

    const newUser = await User.create({
      uid: generatedUid,
      email,
      password: hashedPassword,
      role: 'Employee',
      name,
      deptId: resolvedScope.deptId,
      subDepartment: resolvedScope.subDepartment || normalizeSubDepartmentName(subDepartment || 'General'),
      reportingManagerUid,
      status: 'pending_dept', // Awaiting department admin acceptance
      devPassword: password
    });

    res.status(201).json({ uid: newUser.uid, name: newUser.name, status: newUser.status });
  } catch (error) {
    console.error("HR ONBOARD ERROR:", error);
    res.status(500).json({ message: "Failed to onboard employee", module: "HR" });
  }
});

// [NEW] PUT /employees/:uid - Update personnel details
router.put('/employees/:uid', verifyToken, isHR, avatarUpload.single('avatar'), async (req, res) => {
  try {
    const { uid } = req.params;
    const { email, password, name, status, deptId, reportingManagerUid, subDepartment } = req.body;

    const user = await User.findByPk(uid);
    if (!user) {
      return res.status(404).json({ message: "Personnel record not found", module: "HR" });
    }

    const updates = {
      email: email || user.email,
      role: user.role,
      name: name || user.name,
      status: status || user.status,
      deptId: deptId === undefined ? user.deptId : deptId,
      reportingManagerUid: reportingManagerUid === undefined ? user.reportingManagerUid : reportingManagerUid,
      subDepartment: normalizeSubDepartmentName(subDepartment || user.subDepartment)
    };

    if (password && password.trim() !== '') {
      updates.password = await bcrypt.hash(password, 10);
      updates.devPassword = password;
    }

    if (req.file) {
      updates.avatar = buildAvatarUrl(req, req.file);
    }

    const transaction = await sequelize.transaction();
    try {
      const oldRole = user.role;
      const oldStatus = user.status;

      await user.update(updates, { transaction });

      // Handle Authority Succession if role or status changed to active
      const roleChanged = user.role !== oldRole;
      const becameActive = status === 'active' && oldStatus !== 'active';
      
      if (user.status === 'active' && (roleChanged || becameActive)) {
        await handleAuthoritySuccession(models, user.role, user.uid, transaction);
      }

      await transaction.commit();
      res.json({ message: "Personnel record updated successfully", uid: user.uid });
    } catch (updateError) {
      if (transaction) await transaction.rollback();
      throw updateError;
    }
  } catch (error) {
    console.error("HR UPDATE ERROR:", error);
    res.status(500).json({ message: "Failed to update personnel record", module: "HR" });
  }
});

router.put('/employees/:uid/remap', verifyToken, isHR, async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { uid } = req.params;
    const { departmentId, reportingManagerUid } = req.body;

    if (!departmentId) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Target department is required', module: 'HR' });
    }

    const user = await User.findByPk(uid, {
      include: [{ model: Role, as: 'assignedAdminRoles', attributes: ['id', 'name'], required: false }],
      transaction
    });

    if (!user) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Personnel record not found', module: 'HR' });
    }

    const resolvedScope = await resolveDepartmentScope(departmentId, transaction);
    if (!resolvedScope.deptId && !resolvedScope.subDepartment) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Target department could not be resolved', module: 'HR' });
    }

    let finalizedManagerUid = reportingManagerUid || null;
    if (finalizedManagerUid) {
      const manager = await User.findByPk(finalizedManagerUid, { transaction });
      if (!manager) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Selected reporting manager was not found', module: 'HR' });
      }
    }

    const currentCanonicalRole = normalizeInstitutionRoleName(user.role || '');
    const previousState = {
      uid: user.uid,
      deptId: user.deptId,
      subDepartment: user.subDepartment,
      reportingManagerUid: user.reportingManagerUid,
      role: currentCanonicalRole
    };

    const wasSeededAdmin = await clearSeededAdminAssignment(user, transaction, req.user.uid);
    const nextRole = wasSeededAdmin || SEEDED_ADMIN_ROLE_NAMES.includes(currentCanonicalRole) ? 'Employee' : user.role;

    await user.update({
      deptId: resolvedScope.deptId,
      subDepartment: resolvedScope.subDepartment,
      reportingManagerUid: finalizedManagerUid,
      role: nextRole
    }, { transaction });

    await AuditLog.create({
      userId: req.user.uid,
      action: 'EMPLOYEE_REMAP',
      entity: 'User',
      module: 'HR',
      before: previousState,
      after: {
        uid: user.uid,
        deptId: resolvedScope.deptId,
        subDepartment: resolvedScope.subDepartment,
        reportingManagerUid: finalizedManagerUid,
        role: nextRole
      },
      timestamp: new Date()
    }, { transaction });

    await transaction.commit();
    res.json({
      message: wasSeededAdmin
        ? 'Employee remapped successfully and previous admin mapping was cleared'
        : 'Employee remapped successfully',
      uid: user.uid
    });
  } catch (error) {
    if (transaction && !transaction.finished) await transaction.rollback();
    console.error('HR REMAP ERROR:', error);
    res.status(500).json({ error: 'Failed to remap employee', module: 'HR' });
  }
});

router.delete('/employees/:uid', verifyToken, isHR, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { uid } = req.params;
    const user = await User.findByPk(uid, { transaction: t });
    if (!user) {
      return res.status(404).json({ message: "Personnel record not found", module: "HR" });
    }

    // Cascade Cleanup for activity data to prevent FK constraint failures
    const { AuditLog, Task, Attendance, Leave, SurveyResponse, AnnouncementRead } = models;
    
    await Promise.all([
      AuditLog.destroy({ where: { userId: uid }, transaction: t }),
      Task.destroy({ where: { [Op.or]: [{ assignedTo: uid }, { assignedBy: uid }] }, transaction: t }),
      Attendance.destroy({ where: { userId: uid }, transaction: t }),
      Leave.destroy({ where: { employeeId: uid }, transaction: t }),
      SurveyResponse.destroy({ where: { userUid: uid }, transaction: t }),
      AnnouncementRead.destroy({ where: { userId: uid }, transaction: t })
    ]);

    // Decrement vacancy count if applicable
    if (user.vacancyId) {
      const vacancy = await Vacancy.findByPk(user.vacancyId, { transaction: t });
      if (vacancy) {
        vacancy.filledCount = Math.max(0, vacancy.filledCount - 1);
        if (vacancy.filledCount < vacancy.count) {
          vacancy.status = 'OPEN';
        }
        await vacancy.save({ transaction: t });
      }
    }

    await user.destroy({ transaction: t });
    await t.commit();
    res.json({ message: "Personnel record purged successfully", uid });
  } catch (error) {
    if (t) await t.rollback();
    console.error("HR DELETE ERROR:", error);
    res.status(500).json({ message: "Failed to eliminate personnel record", module: "HR" });
  }
});

// Step 1: FIX API STRUCTURE (Performance Split)
router.get('/performance/summary', verifyToken, isHR, async (req, res) => {
  try {
    const tasks = await Task.findAll();
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    
    res.json({
      totalTasks: total,
      completedTasks: completed,
      avgPerformance: total > 0 ? ((completed / total) * 100).toFixed(1) : 0
    });
  } catch (error) {
    console.error("HR API ERROR:", error);
    res.status(500).json({ message: "Internal server error", module: "HR" });
  }
});

router.get('/performance/employee/:employeeId', verifyToken, async (req, res) => {
  try {
    const { employeeId } = req.params;
    if (!employeeId) return res.status(400).json({ message: "Invalid employeeId", module: "HR" });

    const user = await User.findOne({ where: { uid: employeeId } });
    if (!user) return res.status(404).json({ message: "Employee not found", module: "HR" });

    const requesterRole = req.user.role?.toLowerCase()?.trim() || '';
    const isHrViewer = requesterRole.includes('hr');
    const sameDepartment = Boolean(req.user.deptId) && req.user.deptId === user.deptId;
    const isDepartmentOwner = sameDepartment && (
      requesterRole.includes('admin') ||
      ['finance', 'sales', 'operations', 'academic'].some(token => requesterRole.includes(token))
    );

    if (!isHrViewer && !isDepartmentOwner) {
      return res.status(403).json({ message: "Access denied for this employee performance record", module: "HR" });
    }

    const tasks = await Task.findAll({ where: { assignedTo: employeeId } });
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const delayCount = tasks.filter(t => t.status === 'overdue' || (t.deadline && new Date(t.deadline) < new Date() && t.status !== 'completed')).length;
    const agedPendingLeaves = await Leave.count({
      where: {
        employeeId,
        status: { [Op.in]: ['pending admin', 'pending hr'] },
        createdAt: { [Op.lt]: new Date(Date.now() - (48 * 60 * 60 * 1000)) }
      }
    });
    const productivityScore = Math.max(
      0,
      Math.round((total > 0 ? (completed / total) * 100 : 100) - (delayCount * 15) - (agedPendingLeaves * 10))
    );

    res.json({
      employeeId,
      metrics: {
        taskCompletionRate: total > 0 ? ((completed / total) * 100).toFixed(1) : 0,
        totalTasks: total,
        delayCount,
        agedPendingLeaves,
        productivityScore
      }
    });
  } catch (error) {
    console.error("HR API ERROR:", error);
    res.status(500).json({ message: "Internal server error", module: "HR" });
  }
});

// HR-accessible roles list (for employee registration form)
router.get('/roles', verifyToken, isHR, async (req, res) => {
  try {
    const { Role } = models;
    const roles = await Role.findAll({ order: [['createdAt', 'DESC']] });
    res.json(roles);
  } catch (error) {
    console.error('HR Roles Fetch Error:', error);
    res.status(500).json({ message: 'Failed to fetch roles', module: 'HR' });
  }
});

router.get('/performance/department/:departmentId', verifyToken, isHR, async (req, res) => {
    try {
      const { departmentId } = req.params;
      if (!departmentId) return res.status(400).json({ message: "Invalid departmentId", module: "HR" });
  
      const employees = await User.findAll({ where: { deptId: departmentId, role: 'employee' } });
      const uids = employees.map(e => e.uid);
  
      const tasks = await Task.findAll({ where: { assignedTo: uids } });
      const total = tasks.length;
      const completed = tasks.filter(t => t.status === 'completed').length;
  
      res.json({
        departmentId,
        metrics: {
          teamSize: employees.length,
          taskCompletionRate: total > 0 ? ((completed / total) * 100).toFixed(1) : 0,
          totalTasks: total
        }
      });
    } catch (error) {
      console.error("HR API ERROR:", error);
      res.status(500).json({ message: "Internal server error", module: "HR" });
    }
});

// Step 5: IMPLEMENT MISSING ROUTE (Leaves)
router.get('/leaves', verifyToken, checkPermissionOrRole('HR_LEAVE_S2', 'read', ['HR Admin', 'hr']), applyExecutiveScope, async (req, res) => {
    try {
        const { permissionFilter = {} } = req;
        const { userFilter = {} } = req.visibility || {};

        // Merge RBAC permission filter with model-specific visibility scope
        const combinedFilter = { ...permissionFilter, ...userFilter };

        const leaves = await Leave.findAll({
            where: {
              [Op.or]: [
                { status: { [Op.in]: ['pending hr', 'pending_step2'] } },
                { status: 'approved', step2By: { [Op.ne]: null } },
                { status: 'rejected', step2By: { [Op.ne]: null } }
              ]
            },
            include: [{ 
              model: User, 
              as: 'employee', 
              attributes: ['name', 'uid', 'deptId'],
              include: [{ model: Department, as: 'department', attributes: ['name'] }],
              where: combinedFilter,
              required: true
            }],
            order: [['createdAt', 'DESC']]
        });
        res.json(leaves);
    } catch (error) {
        console.error("HR API ERROR:", error);
        res.status(500).json({ message: "Internal server error", module: "HR" });
    }
});

import { augmentTaskCollection } from '../utils/taskAugmentation.js';

// Task Management
router.get('/tasks', verifyToken, isHR, applyExecutiveScope, async (req, res) => {
    try {
        const { userFilter = {} } = req.visibility || {};
        const tasksRaw = await Task.findAll({
            where: {},
            include: [
                { 
                  model: User, 
                  as: 'assignee', 
                  attributes: ['name', 'uid'],
                  where: userFilter,
                  required: true
                },
                { model: User, as: 'assigner', attributes: ['name', 'uid'] }
            ],
            order: [['createdAt', 'DESC']]
        });
        const tasks = augmentTaskCollection(tasksRaw);
        res.json(tasks);
    } catch (error) {
        console.error("HR API ERROR:", error);
        res.status(500).json({ message: "Internal server error", module: "HR" });
    }
});

router.post('/tasks', verifyToken, async (req, res) => {
    try {
      const { assignedTo, title, deadline, priority, description } = req.body;
      if (!assignedTo || !title) {
          return res.status(400).json({ message: "Invalid payload: assignedTo and title required", module: "HR" });
      }

      // 1. Resolve target user's context for RBAC enforcement
      const targetUser = await User.findOne({ where: { uid: assignedTo } });
      if (!targetUser) return res.status(404).json({ message: "Assignee not found", module: "HR" });

      try {
        // [RBAC] Centralized Governance Enforcement
        validateTaskAssignment(req.user, targetUser);
      } catch (rbacError) {
        console.error(`[RBAC-VIOLATION] UID ${req.user.uid} attempted invalid assignment to ${assignedTo}: ${rbacError.message}`);
        return res.status(403).json({ 
          error: "Invalid task assignment: role hierarchy violation",
          details: rbacError.message,
          module: "HR"
        });
      }

      const task = await Task.create({
        assignedTo,
        assignedBy: req.user.uid,
        title,
        deadline,
        priority: priority || 'medium',
        status: 'pending',
        description,
        departmentId: targetUser.deptId,
        subDepartmentId: targetUser.subDepartment
      }, { context: { assigner: req.user } });

      // Notify the recipient with the universal tasks link
      await createNotification(req.io, {
        targetUid: assignedTo,
        title: 'New Institutional Directive',
        message: `New task: ${title}. High-priority delivery expected.`,
        type: 'info',
        link: '/dashboard/tasks'
      });

      res.status(201).json(task);
    } catch (error) {
      console.error("HR API ERROR:", error);
      res.status(500).json({ message: "Internal server error", module: "HR" });
    }
});

router.get('/employee-communications', verifyToken, isHR, async (req, res) => {
  try {
    const requests = await EmployeeHRRequest.findAll({
      order: [['createdAt', 'DESC']]
    });

    let enrichedRequests = requests.map((request) => ({
      ...request.toJSON(),
      employee: {
        uid: request.employeeId,
        name: 'Unknown Employee',
        email: null,
        deptId: null,
        department: null
      },
      responder: null
    }));

    try {
      const employeeIds = [...new Set(requests.map((request) => request.employeeId).filter(Boolean))];
      const responderIds = [...new Set(requests.map((request) => request.respondedBy).filter(Boolean))];

      const employees = employeeIds.length
        ? await User.findAll({
            where: { uid: { [Op.in]: employeeIds } },
            attributes: ['uid', 'name', 'email', 'deptId']
          })
        : [];

      const departmentIds = [...new Set(employees.map((employee) => employee.deptId).filter(Boolean))];
      const departments = departmentIds.length
        ? await Department.findAll({
            where: { id: { [Op.in]: departmentIds } },
            attributes: ['id', 'name']
          })
        : [];

      const responders = responderIds.length
        ? await User.findAll({
            where: { uid: { [Op.in]: responderIds } },
            attributes: ['uid', 'name']
          })
        : [];

      const departmentMap = new Map(departments.map((department) => [String(department.id), department]));
      const employeeMap = new Map(employees.map((employee) => [employee.uid, employee]));
      const responderMap = new Map(responders.map((responder) => [responder.uid, responder]));

      enrichedRequests = requests.map((request) => {
        const requestJson = request.toJSON();
        const employee = employeeMap.get(request.employeeId);
        const responder = request.respondedBy ? responderMap.get(request.respondedBy) : null;
        const department = employee?.deptId ? departmentMap.get(String(employee.deptId)) : null;

        return {
          ...requestJson,
          employee: employee ? {
            uid: employee.uid,
            name: employee.name,
            email: employee.email,
            deptId: employee.deptId,
            department: department ? { name: department.name } : null
          } : {
            uid: request.employeeId,
            name: 'Unknown Employee',
            email: null,
            deptId: null,
            department: null
          },
          responder: responder ? {
            uid: responder.uid,
            name: responder.name
          } : null
        };
      });
    } catch (enrichmentError) {
      console.error('Employee communication enrichment fallback activated:', enrichmentError);
    }

    res.json(enrichedRequests);
  } catch (error) {
    console.error('Fetch employee HR communications error:', error);
    res.json([]);
  }
});

router.put('/employee-communications/:id', verifyToken, isHR, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, hrResponse } = req.body;

    const request = await EmployeeHRRequest.findByPk(id, {
      include: [{ model: User, as: 'employee', attributes: ['uid', 'name'] }]
    });

    if (!request) {
      return res.status(404).json({ error: 'Communication request not found' });
    }

    const nextStatus = ['open', 'in_review', 'resolved'].includes(status) ? status : request.status;

    await request.update({
      status: nextStatus,
      hrResponse: hrResponse?.trim() || request.hrResponse,
      respondedBy: req.user.uid,
      respondedAt: new Date()
    });

    await createNotification(req.io, {
      targetUid: request.employeeId,
      title: 'HR Response Update',
      message: `HR updated your request "${request.subject}" to ${nextStatus.replace('_', ' ')}.`,
      type: nextStatus === 'resolved' ? 'success' : 'info',
      link: '/dashboard/employee/hr-contact'
    });

    res.json({ message: 'Employee communication updated successfully', request });
  } catch (error) {
    console.error('Update employee HR communication error:', error);
    res.status(500).json({ error: 'Failed to update employee communication' });
  }
});

// Mid-stream resource loader for approval chain enforcement
const loadLeaveResource = async (req, res, next) => {
  try {
    const leave = await Leave.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'employee',
          attributes: ['uid', 'name', 'deptId', 'subDepartment']
        }
      ]
    });
    if (!leave) return res.status(404).json({ error: 'Leave request not found' });
    req.resource = leave;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Failed to load institutional resource' });
  }
};

router.put('/leaves/:id/approve', 
    verifyToken, 
    checkPermissionOrRole('HR_LEAVE_S2', 'approve', ['HR Admin', 'hr']), 
    loadLeaveResource,
    enforceApprovalChain({ 
      currentStatusField: 'status', 
      validInitialStatuses: ['pending hr'], 
      initiatorField: 'employeeId' 
    }), 
    async (req, res) => {
    try {
        const leave = req.resource;
        // Logic already checked by middleware

        await leave.update({
            status: 'approved',
            step2By: req.user.uid
        });

        // NOTIFICATIONS
        if (req.io || true) { // createNotification persistent by default
            // 1. Notify Employee
            await createNotification(req.io, {
                targetUid: leave.employeeId,
                title: 'Leave Finalized',
                message: `Your leave request for ${leave.type} (${leave.fromDate} to ${leave.toDate}) has been FULLY APPROVED by HR.`,
                type: 'success',
                link: '/dashboard/employee/leaves'
            });

            // 2. Notify Dept Admin / Head
            const employeeDepartment = leave.employee?.deptId
              ? await Department.findByPk(leave.employee.deptId, { attributes: ['id', 'adminId'] })
              : null;
            const targetAdminUid = leave.step1By || employeeDepartment?.adminId;

            if (targetAdminUid && targetAdminUid !== req.user.uid) {
                const targetAdmin = await User.findByPk(targetAdminUid);
                const role = targetAdmin?.role?.toLowerCase()?.trim() || '';
                
                // HR department doesn't need to be notified of their own approval actions
                if (role !== 'hr admin') {
                    let adminLink = '/dashboard/tasks'; 
                    
                    if (role.includes('sales')) adminLink = '/dashboard/sales/leave-status';
                    else if (role.includes('finance')) adminLink = '/dashboard/finance/leave-status';
                    else if (role.includes('operations') || role.includes('academic')) adminLink = '/dashboard/operations/leave-status';
                    else if (role.includes('open school') || role.includes('openschool')) adminLink = '/dashboard/subdept/openschool/leave-status';
                    else if (role.includes('online')) adminLink = '/dashboard/subdept/online/leave-status';
                    else if (role.includes('skill')) adminLink = '/dashboard/subdept/skill/leave-status';
                    else if (role.includes('bvoc')) adminLink = '/dashboard/subdept/bvoc/leave-status';
                    else if (role.includes('hr')) adminLink = '/dashboard/hr/dept-leave-status';

                    await createNotification(req.io, {
                        targetUid: targetAdminUid,
                        title: 'Team Leave Finalized',
                        message: `Leave request for ${leave.employee?.name || 'team member'} was FULLY APPROVED by HR.`,
                        type: 'info',
                        link: adminLink
                    });
                }
            }
        }

        res.json({ message: 'Leave request fully approved', leave });
    } catch (error) {
        console.error("HR LEAVE APPROVE ERROR:", error);
        res.status(500).json({ message: "Internal server error", module: "HR" });
    }
});

router.put('/leaves/:id/reject', verifyToken, isHR, async (req, res) => {
    try {
        const { id } = req.params;
        const { remarks } = req.body;
        
        const leave = await Leave.findByPk(id, { include: [{ model: User, as: 'employee' }] });
        if (!leave) return res.status(404).json({ error: 'Leave request not found' });
        
        if (leave.status !== 'pending hr') {
            return res.status(400).json({ error: `Cannot reject in current status: ${leave.status}` });
        }

        await leave.update({
            status: 'rejected',
            step2By: req.user.uid,
            reason: remarks ? `${leave.reason || ''} [HR Reject: ${remarks}]` : leave.reason
        });

        await createNotification(req.io, {
            targetUid: leave.employeeId,
            title: 'Leave Rejected',
            message: `Your leave request for ${leave.type} was rejected by HR.`,
            type: 'error',
            link: '/dashboard/employee/leaves'
        });

        res.json({ message: 'Leave request rejected by HR', leave });
    } catch (error) {
        res.status(500).json({ error: 'Leave rejection protocol failure' });
    }
});

// Step 1: Institutional Leave Validation (Dept Admin / Manager)
router.put('/leaves/:id/step1-approve', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { remarks } = req.body;
        
        const leave = await Leave.findByPk(id, { include: [{ model: User, as: 'employee' }] });
        if (!leave) return res.status(404).json({ error: 'Leave request not found' });
        
        // Authority Guard: Only Dept Admin or Reporting Manager can perform Step 1
        const isManager = req.user.uid === leave.employee?.reportingManagerUid;
        const isDeptAdmin = req.user.deptId === leave.employee?.deptId && (req.user.role?.toLowerCase()?.includes('admin') || req.user.role?.toLowerCase()?.includes('head'));
        
        if (!isManager && !isDeptAdmin && req.user.role !== 'Organization Admin') {
            return res.status(403).json({ error: 'Governance Violation: Only Department Admin or Reporting Manager can perform Step-1 validation.' });
        }

        if (leave.status !== 'pending admin') {
            return res.status(400).json({ error: `Protocol Conflict: Cannot Step-1 approve in current status: ${leave.status}` });
        }

        await leave.update({
            status: 'pending hr',
            step1By: req.user.uid,
            reason: remarks ? `${leave.reason || ''} [Step1 Audit: ${remarks}]` : leave.reason
        });

        // Notify HR of pending oversight action
        await createNotification(req.io, {
            targetUid: 'HR_ADMIN_POOL', // System broad-cast to HR role
            title: 'Oversight Required: Leave Step-2',
            message: `Leave for ${leave.employee?.name} validated by Dept. Final HR ratification required.`,
            type: 'info',
            link: '/dashboard/hr/leaves'
        });

        res.json({ message: 'Step-1 Validation successful. Routed to HR for final oversight.', leave });
    } catch (error) {
        res.status(500).json({ error: 'Leave validation protocol failure' });
    }
});

// --- Institutional Presence & Engagement (Attendance) ---

router.get('/attendance/registry', verifyToken, isHR, async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'Date parameter required (YYYY-MM-DD)' });

    const { Attendance, User, Leave, Department } = models;

    // 1. Fetch all workforce users (mirroring Employees.tsx logic)
    const users = await User.findAll({
      attributes: ['uid', 'name', 'role', 'vacancyId'],
      include: [{ model: Department, as: 'department', attributes: ['name'] }],
      order: [['name', 'ASC']]
    });

    // 2. Fetch existing attendance for this date
    const attendanceRecords = await Attendance.findAll({
      where: { date }
    });

    // 3. Fetch approved leaves for this date
    const leaves = await Leave.findAll({
      where: {
        status: 'approved',
        fromDate: { [Op.lte]: date },
        toDate: { [Op.gte]: date }
      }
    });

    // 4. Map data for frontend consumption
    const attendanceMap = {};
    attendanceRecords.forEach(r => {
      attendanceMap[r.userId] = { status: r.status, remarks: r.remarks };
    });

    const leaveMap = {};
    leaves.forEach(l => {
      leaveMap[l.employeeId] = true;
    });

    res.json({
      users,
      attendance: attendanceMap,
      leaves: leaveMap
    });
  } catch (error) {
    console.error('[HR-ATTENDANCE-REGISTRY-ERROR]:', error);
    res.status(500).json({ error: 'Failed to fetch attendance registry' });
  }
});

router.post('/attendance/mark', verifyToken, isHR, async (req, res) => {
  try {
    const { userId, date, status, remarks } = req.body;
    if (!userId || !date || !status) {
      return res.status(400).json({ error: 'Missing required fields: userId, date, status' });
    }

    const { Attendance } = models;

    // Atomic Upsert
    const [record, created] = await Attendance.findOrCreate({
      where: { userId, date },
      defaults: { status, remarks }
    });

    if (!created) {
      await record.update({ status, remarks });
    }

    res.json({ message: 'Attendance status updated', attendance: record });
  } catch (error) {
    console.error('[HR-ATTENDANCE-MARK-ERROR]:', error);
    res.status(500).json({ error: 'Attendance update protocol failure' });
  }
});

router.post('/attendance/clock-in', verifyToken, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { status, remarks } = req.body;

    const [attendance, created] = await Attendance.findOrCreate({
      where: { userId: req.user.uid, date: today },
      defaults: { status: status || 'present', remarks }
    });

    if (!created) {
      return res.status(400).json({ error: 'Attendance already recorded for today.' });
    }

    res.status(201).json({ message: 'Institutional presence recorded.', attendance });
  } catch (error) {
    res.status(500).json({ error: 'Attendance recording protocol failure' });
  }
});

router.get('/attendance/report/:userId', verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    // Privacy Guard: Users can only see their own or managers see team
    const isSelf = req.user.uid === userId;
    const isManager = (await User.findByPk(userId))?.reportingManagerUid === req.user.uid;
    const isAdmin = ['hr admin', 'organization admin', 'ceo'].includes(req.user.role?.toLowerCase()?.trim());

    if (!isSelf && !isManager && !isAdmin) {
      return res.status(403).json({ error: 'Access denied: Viewing clearance restricted.' });
    }

    const report = await Attendance.findAll({
      where: { userId },
      order: [['date', 'DESC']],
      limit: 30
    });

    res.json(report);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch attendance telemetry' });
  }
});

// --- Referral & Growth Synchronization ---

router.post('/referrals/submit', verifyToken, async (req, res) => {
  try {
    const { name, phone, email, notes } = req.body;

    // 1. Safe Referral Code Generation
    const userUid = req.user?.uid || 'UNKNOWN';
    const referral = await Referral.findOne({ where: { userId: userUid } });
    const code = referral?.code || `REF-${String(userUid).slice(-4)}`;

    // 2. Lead Creation with Audit
    const lead = await Lead.create({
      name,
      phone,
      email,
      source: 'Employee Referral',
      referralCode: code,
      employeeId: userUid,
      notes: notes || `Referred by institutional member: ${req.user?.name || 'Staff'}`,
      status: 'NEW'
    });

    await logAction({
        userId: userUid,
        action: 'SUBMIT_REFERRAL',
        entity: 'Lead',
        details: `Employee submitted referral: ${name} (${phone}). Code: ${code}`,
        module: 'HR'
    });

    res.status(201).json({ message: 'Referral submitted and tracked correctly.', lead });
  } catch (error) {
    console.error('[REFERRAL_ERROR]:', error);
    res.status(500).json({ error: 'Referral tracking protocol failure', message: error.message });
  }
});


export default router;
