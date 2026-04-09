
import { applyExecutiveScope } from '../middleware/visibility.js';
import express from 'express';
import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import { models, sequelize } from '../models/index.js';
import { verifyToken, roleGuard } from '../middleware/verifyToken.js';
import { createNotification } from './notifications.js';

import { logAction } from '../lib/audit.js';
import { validateTaskAssignment } from '../utils/rbac/validateTaskAssignment.js';

const router = express.Router();
const { User, Vacancy, Task, Department, Leave, Attendance, Lead, Referral, AuditLog, ReregRequest } = models;

const isHR = roleGuard(['HR Admin', 'Organization Admin', 'ceo', 'hr']);

const COLLECTION_ROLES = [
  'CEO',
  'ceo',
  'Employee',
  'student',
  'Partner Center',
  'Sales & CRM Admin',
  'Sales',
  'HR Admin',
  'hr',
  'Operations Admin',
  'Academic Operations Admin',
  'Finance Admin',
  'Organization Admin',
  'ops',
  'finance'
];

/**
 * Institutional Governance: Authority Succession
 */
const handleAuthoritySuccession = async (role, newUserId, transaction, adminUid = 'SYSTEM') => {
  if (COLLECTION_ROLES.includes(role)) return;

  const predecessors = await models.User.findAll({
    where: { role, status: 'active', uid: { [Op.ne]: newUserId } },
    transaction
  });

  if (predecessors.length > 0) {
    console.log(`[HR-GOVERNANCE] Authority Succession: Transitioning ${predecessors.length} predecessor(s) of role '${role}' to suspended.`);
    await models.User.update(
      { status: 'suspended' },
      { where: { role, status: 'active', uid: { [Op.ne]: newUserId } }, transaction }
    );
    
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

// Step 9: Logging Middleware
router.use((req, res, next) => {
    console.log("HR API HIT:", req.url);
    next();
});

// Step 7: FIX STATS API
router.get('/stats', verifyToken, isHR, applyExecutiveScope, async (req, res) => {
  try {
    const { filter: visibilityFilter } = req.visibility;
    const workforceFilter = {
      status: 'active',
      vacancyId: { [Op.not]: null }, // Use Op.not for cleaner NULL check
      ...visibilityFilter
    };

    const [employeeCount, vacancyCount, pendingLeaves, activeTasks] = await Promise.all([
      User.count({ where: workforceFilter }),
      Vacancy.count({ where: { status: 'OPEN', ...visibilityFilter } }),
      Leave.count({ 
        where: { status: { [Op.like]: 'pending%' } },
        include: [{ model: User, as: 'employee', where: visibilityFilter, required: true }]
      }),
      Task.count({ 
        where: { status: 'pending' },
        include: [{ model: User, as: 'assignee', where: visibilityFilter, required: true }]
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
    const { filter: visibilityFilter } = req.visibility;
    const vacancies = await Vacancy.findAll({
      where: visibilityFilter,
      include: [{ model: Department, as: 'department', attributes: ['name'] }],
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
        { model: User, as: 'manager', attributes: ['name', 'uid'], required: false }
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

router.post('/employees', verifyToken, isHR, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { vacancyId, email, password, name, reportingManagerUid, role } = req.body;

    if (!vacancyId || !email || !password || !name) {
      return res.status(400).json({ 
        error: "Invalid payload: email, password, name and vacancyId required", 
        module: "HR" 
      });
    }

    const vacancy = await Vacancy.findByPk(vacancyId, { transaction: t });
    if (!vacancy || vacancy.status !== 'OPEN' || vacancy.filledCount >= vacancy.count) {
      return res.status(400).json({ message: "Selected vacancy is invalid or already filled.", module: "HR" });
    }

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
      role: role || 'employee',
      name,
      deptId: vacancy.departmentId,
      subDepartment: vacancy.subDepartment || 'General', // Inheritance from Vacancy Unit Tag
      reportingManagerUid: finalizedManagerUid,
      vacancyId,
      status: 'active',
      devPassword: password
    }, { transaction: t });

    vacancy.filledCount += 1;
    if (vacancy.filledCount >= vacancy.count) {
      vacancy.status = 'CLOSED';
    }
    await vacancy.save({ transaction: t });

    // Handle Authority Succession if the new user is active
    if (newUser.status === 'active') {
      await handleAuthoritySuccession(newUser.role, newUser.uid, t, req.user.uid);
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
    const { email, password, name, departmentId, subDepartment, role, reportingManagerUid } = req.body;

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

    const newUser = await User.create({
      uid: generatedUid,
      email,
      password: hashedPassword,
      role: role || 'employee',
      name,
      deptId: departmentId,
      subDepartment: subDepartment || 'General',
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
router.put('/employees/:uid', verifyToken, isHR, async (req, res) => {
  try {
    const { uid } = req.params;
    const { email, password, role, name, status, deptId, reportingManagerUid, subDepartment } = req.body;

    const user = await User.findByPk(uid);
    if (!user) {
      return res.status(404).json({ message: "Personnel record not found", module: "HR" });
    }

    const updates = {
      email: email || user.email,
      role: role || user.role,
      name: name || user.name,
      status: status || user.status,
      deptId: deptId === undefined ? user.deptId : deptId,
      reportingManagerUid: reportingManagerUid === undefined ? user.reportingManagerUid : reportingManagerUid,
      subDepartment: subDepartment || user.subDepartment
    };

    if (password && password.trim() !== '') {
      updates.password = await bcrypt.hash(password, 10);
      updates.devPassword = password;
    }

    const transaction = await sequelize.transaction();
    try {
      const oldRole = user.role;
      const oldStatus = user.status;

      await user.update(updates, { transaction });

      // Handle Authority Succession if role or status changed to active
      const roleChanged = role && role !== oldRole;
      const becameActive = status === 'active' && oldStatus !== 'active';
      
      if (user.status === 'active' && (roleChanged || becameActive)) {
        await handleAuthoritySuccession(user.role, user.uid, transaction);
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

    const tasks = await Task.findAll({ where: { assignedTo: employeeId } });
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;

    res.json({
      employeeId,
      metrics: {
        taskCompletionRate: total > 0 ? ((completed / total) * 100).toFixed(1) : 0,
        totalTasks: total
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
router.get('/leaves', verifyToken, isHR, applyExecutiveScope, async (req, res) => {
    try {
        const { filter: visibilityFilter } = req.visibility;
        const leaves = await Leave.findAll({
            where: {},
            include: [{ 
              model: User, 
              as: 'employee', 
              attributes: ['name', 'uid', 'deptId'],
              include: [{ model: Department, as: 'department', attributes: ['name'] }],
              where: visibilityFilter,
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

// Task Management
router.get('/tasks', verifyToken, isHR, applyExecutiveScope, async (req, res) => {
    try {
        const { filter: visibilityFilter } = req.visibility;
        const tasks = await Task.findAll({
            where: {},
            include: [
                { 
                  model: User, 
                  as: 'assignee', 
                  attributes: ['name', 'uid'],
                  where: visibilityFilter,
                  required: true
                },
                { model: User, as: 'assigner', attributes: ['name', 'uid'] }
            ],
            order: [['createdAt', 'DESC']]
        });
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

router.put('/leaves/:id/approve', verifyToken, isHR, async (req, res) => {
    try {
        const { id } = req.params;
        const leave = await Leave.findByPk(id, {
            include: [{ model: User, as: 'employee' }]
        });

        if (!leave) return res.status(404).json({ error: 'Leave request not found' });
        if (leave.status !== 'pending_step2') {
            return res.status(400).json({ error: `Cannot Step-2 approve in current status: ${leave.status}` });
        }

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
            const targetAdminUid = leave.step1By || (await User.findOne({ 
                include: [{ model: Department, as: 'department', where: { id: leave.employee?.deptId } }] 
            }))?.department?.adminId;

            if (targetAdminUid && targetAdminUid !== req.user.uid) {
                const targetAdmin = await User.findByPk(targetAdminUid);
                const role = targetAdmin?.role?.toLowerCase()?.trim();
                
                // HR department doesn't need to be notified of their own approval actions
                if (role !== 'hr admin') {
                    let adminLink = '/dashboard/team/leaves'; 
                    
                    if (role === 'Sales & CRM Admin') adminLink = '/dashboard/sales/leaves';
                    else if (role === 'Finance Admin') adminLink = '/dashboard/finance/leaves';
                    else if (role === 'Operations Admin') adminLink = '/dashboard/operations/leaves';
                    else if (role === 'Academic Admin') adminLink = '/dashboard/academic/leaves';
                    else if (['Open School Admin', 'Online Department Admin', 'Skill Department Admin', 'BVoc Department Admin'].includes(role)) adminLink = `/dashboard/subdept/${role}/leaves`;

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

        if (leave.status !== 'pending_step1') {
            return res.status(400).json({ error: `Protocol Conflict: Cannot Step-1 approve in current status: ${leave.status}` });
        }

        await leave.update({
            status: 'pending_step2',
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

router.put('/leaves/:id/reject', verifyToken, isHR, async (req, res) => {
    try {
        const { id } = req.params;
        const leave = await Leave.findByPk(id);

        if (!leave) return res.status(404).json({ error: 'Leave request not found' });
        if (leave.status !== 'pending_step2') {
            return res.status(400).json({ error: `Cannot Step-2 reject in current status: ${leave.status}` });
        }

        await leave.update({
            status: 'rejected_step2',
            step2By: req.user.uid
        });

        // NOTIFICATIONS
        if (req.io || true) {
            // 1. Notify Employee
            await createNotification(req.io, {
                targetUid: leave.employeeId,
                title: 'Leave Rejected',
                message: `Your leave request for ${leave.type} has been rejected by HR Oversight.`,
                type: 'error',
                link: '/dashboard/employee/leaves'
            });

            // 2. Notify Dept Admin / Head 
            // We need employee info for dept lookup if step1By is missing
            const leaveWithDetails = await Leave.findByPk(id, {
                include: [{ model: User, as: 'employee' }]
            });
            const targetAdminUid = leave.step1By || (await User.findOne({ 
                include: [{ model: Department, as: 'department', where: { id: leaveWithDetails?.employee?.deptId } }] 
            }))?.department?.adminId;

            if (targetAdminUid && targetAdminUid !== req.user.uid) {
                const targetAdmin = await User.findByPk(targetAdminUid);
                const role = targetAdmin?.role?.toLowerCase()?.trim();
                
                // HR department doesn't need to be notified of their own rejection actions
                if (role !== 'hr admin') {
                    let adminLink = '/dashboard/team/leaves'; 
                    
                    if (role === 'Sales & CRM Admin') adminLink = '/dashboard/sales/leaves';
                    else if (role === 'Finance Admin') adminLink = '/dashboard/finance/leaves';
                    else if (role === 'Operations Admin') adminLink = '/dashboard/operations/leaves';
                    else if (role === 'Academic Admin') adminLink = '/dashboard/academic/leaves';
                    else if (['Open School Admin', 'Online Department Admin', 'Skill Department Admin', 'BVoc Department Admin'].includes(role)) adminLink = `/dashboard/subdept/${role}/leaves`;

                    await createNotification(req.io, {
                        targetUid: targetAdminUid,
                        title: 'Team Leave Rejected',
                        message: `Leave request for ${leaveWithDetails?.employee?.name || 'team member'} was REJECTED by HR Oversight.`,
                        type: 'warning',
                        link: adminLink
                    });
                }
            }
        }

        res.json({ message: 'Leave request rejected by HR', leave });
    } catch (error) {
        console.error("HR LEAVE REJECT ERROR:", error);
        res.status(500).json({ message: "Internal server error", module: "HR" });
    }
});

export default router;
