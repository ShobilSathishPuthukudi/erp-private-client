import express from 'express';
import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import { models, sequelize } from '../models/index.js';
import { verifyToken, roleGuard } from '../middleware/verifyToken.js';
import { logAction } from '../lib/audit.js';

const router = express.Router();
const { User, Vacancy, Task, Department, Leave } = models;

// Middleware for HR or Admin
const isHR = roleGuard(['hr', 'org-admin', 'system-admin']);

// --- Vacancy Management (Workforce Planning) ---

router.post('/vacancies', verifyToken, isHR, async (req, res) => {
  try {
    const { title, departmentId, subDepartment, count, requirements } = req.body;
    const vacancy = await Vacancy.create({
      title,
      departmentId,
      subDepartment,
      count,
      requirements,
      status: 'OPEN'
    });
    res.status(201).json(vacancy);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/vacancies', verifyToken, async (req, res) => {
  try {
    const vacancies = await Vacancy.findAll({
      include: [{ model: Department, as: 'department', attributes: ['name'] }]
    });
    res.json(vacancies);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Employee Management (Workforce Control) ---

router.get('/employees', verifyToken, isHR, async (req, res) => {
  try {
    const employees = await User.findAll({
      attributes: { exclude: ['password'] },
      include: [
        { model: Department, as: 'department', attributes: ['name'] },
        { model: User, as: 'manager', attributes: ['name', 'uid'] }
      ]
    });
    res.json(employees);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/employees', verifyToken, isHR, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { 
      vacancyId, email, password, name, deptId, subDepartment, 
      reportingManagerUid, role 
    } = req.body;

    // STRICT RULE: No employee without vacancy
    if (!vacancyId) {
      return res.status(400).json({ error: 'STRICT RULE: Employee creation requires an active vacancy.' });
    }

    const vacancy = await Vacancy.findByPk(vacancyId, { transaction: t });
    if (!vacancy || vacancy.status !== 'OPEN' || vacancy.filledCount >= vacancy.count) {
      return res.status(400).json({ error: 'Selected vacancy is invalid, closed, or already filled.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const generatedUid = `EMP-${Date.now().toString().slice(-6)}`;

    const newUser = await User.create({
      uid: generatedUid,
      email,
      password: hashedPassword,
      role: role || 'employee',
      name,
      deptId: vacancy.departmentId, // Forced from vacancy
      subDepartment: vacancy.subDepartment, // Forced from vacancy
      reportingManagerUid,
      reporting_manager_id: reportingManagerUid, // Sync for architecture alignment
      vacancyId,
      status: 'active'
    }, { transaction: t });

    // Internal vacancy update
    vacancy.filledCount += 1;
    if (vacancy.filledCount >= vacancy.count) {
      vacancy.status = 'CLOSED';
    }
    await vacancy.save({ transaction: t });

    await logAction({
      userId: req.user.uid,
      action: 'CREATE',
      entity: 'Employee',
      details: `Hired via Vacancy #${vacancyId}: ${newUser.name}`,
      module: 'HR'
    });

    await t.commit();
    res.status(201).json({ uid: newUser.uid, name: newUser.name });
  } catch (error) {
    if (t) await t.rollback();
    res.status(400).json({ error: error.message });
  }
});

// --- Task & Execution System (Workforce Direction) ---

// 1. Task Creation: Check if assignee is on leave
router.post('/tasks', verifyToken, async (req, res) => {
  try {
    const { assignedTo, title, deadline, priority, description } = req.body;
    
    // Hardening: Block assignment if on leave
    const activeLeave = await Leave.findOne({
        where: {
            employeeId: assignedTo,
            status: 'approved',
            fromDate: { [Op.lte]: new Date() },
            toDate: { [Op.gte]: new Date() }
        }
    });

    if (activeLeave) {
        return res.status(403).json({ error: 'Validation Failure: Assignee is currently on approved leave.' });
    }

    // Hierarchy Check: Can only assign to subordinates or self
    if (req.user.role !== 'system-admin' && req.user.role !== 'org-admin') {
       const assignee = await User.findByPk(assignedTo);
       if (assignee.reportingManagerUid !== req.user.uid && assignedTo !== req.user.uid) {
         return res.status(403).json({ error: 'Hierarchy Violation: Cannot assign tasks outside your reporting line.' });
       }
    }

    const task = await Task.create({
      assignedTo,
      assignedBy: req.user.uid,
      title,
      deadline,
      priority: priority || 'medium',
      status: 'pending',
      description
    });

    res.status(201).json(task);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/tasks/:id', verifyToken, async (req, res) => {
  try {
    const { status, evidenceUrl } = req.body;
    const task = await Task.findByPk(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    // Authorization: Assignee or Assigner
    if (task.assignedTo !== req.user.uid && task.assignedBy !== req.user.uid) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await task.update({ 
      status: status || task.status, 
      evidenceUrl: evidenceUrl || task.evidenceUrl,
      completedAt: (status === 'completed' && !task.completedAt) ? new Date() : task.completedAt
    });

    res.json(task);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/tasks/:id/escalate', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const task = await Task.findByPk(id, {
      include: [{ model: User, as: 'assignee', attributes: ['reportingManagerUid'] }]
    });

    if (!task) return res.status(404).json({ error: 'Task not found' });
    
    // Authorization: Only the assignee can escalate to their manager
    if (task.assignedTo !== req.user.uid && !['hr', 'org-admin', 'system-admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Escalation protocol access denied' });
    }

    const managerUid = task.assignee?.reportingManagerUid;
    if (!managerUid) return res.status(400).json({ error: 'No manager assigned for escalation' });

    await task.update({
      assignedTo: managerUid,
      priority: 'urgent',
      status: 'overdue', // Flag as overdue/failed for the original assignee
      escalationLevel: 'MANAGER',
      escalatedFrom: req.user.uid,
      escalationReason: reason,
      remarks: `Escalated by ${req.user.uid}: ${reason}`
    });

    await logAction({
      userId: req.user.uid,
      action: 'ESCALATE',
      entity: 'Task',
      details: `Task #${id} escalated to manager ${managerUid}`,
      module: 'HR'
    });

    res.json({ message: 'Task escalated successfully', task });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/tasks/:id/escalate-to-ceo', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const task = await Task.findByPk(id, {
      include: [{ model: User, as: 'assignee' }]
    });

    if (!task) return res.status(404).json({ error: 'Task not found' });
    
    // PRD Rule: Manager must have no action within 48 hours for auto-escalation or manually for urgent
    // For manual CEO escalation, we check if it's already at MANAGER level
    if (task.escalationLevel === 'EMPLOYEE' && !['hr', 'org-admin', 'system-admin'].includes(req.user.role)) {
       return res.status(403).json({ error: 'Escalation Violation: Task must be escalated to Manager before CEO.' });
    }

    // Identify CEO (role: 'ceo' or 'system-admin')
    const ceo = await User.findOne({ where: { role: 'ceo' } }) || await User.findOne({ where: { role: 'system-admin' } });
    if (!ceo) return res.status(400).json({ error: 'No CEO account found for final escalation' });

    await task.update({
      assignedTo: ceo.uid,
      priority: 'urgent',
      escalationLevel: 'CEO',
      escalatedAt: new Date(),
      remarks: `CEO ESCALATION by ${req.user.uid}: ${reason}`
    });

    await logAction({
      userId: req.user.uid,
      action: 'CEO_ESCALATE',
      entity: 'Task',
      details: `Task #${id} escalated to CEO ${ceo.uid}`,
      module: 'HR'
    });

    res.json({ message: 'Task escalated to CEO successfully.', task });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/tasks', verifyToken, isHR, async (req, res) => {
  try {
    const tasks = await Task.findAll({
      include: [
        { model: User, as: 'assignee', attributes: ['name', 'uid'] },
        { model: User, as: 'assigner', attributes: ['name', 'uid'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/tasks/team/:managerUid', verifyToken, async (req, res) => {
  try {
    const { managerUid } = req.params;
    
    // Authorization: Manager or Admin
    if (req.user.uid !== managerUid && !['hr', 'org-admin', 'system-admin'].includes(req.user.role)) {
       return res.status(403).json({ error: 'Access denied' });
    }

    const teamTasks = await Task.findAll({
      include: [{
        model: User,
        as: 'assignee',
        where: { reportingManagerUid: managerUid },
        attributes: ['name', 'uid']
      }],
      order: [['deadline', 'ASC']]
    });

    res.json(teamTasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Performance Tracking (Execution Layer Control) ---

router.get('/performance/team/:managerUid', verifyToken, async (req, res) => {
  try {
    const { managerUid } = req.params;
    
    // Authorization
    if (req.user.uid !== managerUid && !['hr', 'org-admin', 'system-admin'].includes(req.user.role)) {
       return res.status(403).json({ error: 'Access denied' });
    }

    const team = await User.findAll({ where: { reportingManagerUid: managerUid } });
    const uids = team.map(u => u.uid);

    const tasks = await Task.findAll({ where: { assignedTo: uids } });

    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const overdue = tasks.filter(t => t.status === 'overdue' || (t.status !== 'completed' && new Date(t.deadline) < new Date())).length;

    res.json({
      managerUid,
      teamSize: team.length,
      metrics: {
        taskCompletionRate: total > 0 ? ((completed / total) * 100).toFixed(1) : 0,
        delayCount: overdue,
        totalTasks: total
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/performance/:uid', verifyToken, async (req, res) => {
  try {
    const { uid } = req.params;
    
    // Authorization: Self, Manager, or HR
    if (req.user.uid !== uid) {
       const user = await User.findByPk(uid);
       if (user.reportingManagerUid !== req.user.uid && !['hr', 'org-admin', 'system-admin'].includes(req.user.role)) {
         return res.status(403).json({ error: 'Access denied' });
       }
    }

    const tasks = await Task.findAll({ where: { assignedTo: uid } });

    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const overdue = tasks.filter(t => t.status === 'overdue' || (t.status !== 'completed' && new Date(t.deadline) < new Date())).length;

    res.json({
      uid,
      metrics: {
        taskCompletionRate: total > 0 ? ((completed / total) * 100).toFixed(1) : 0,
        delayCount: overdue,
        totalTasks: total
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Payroll & Attendance Integration (Salary Engine) ---

router.get('/payroll/:uid', verifyToken, async (req, res) => {
  try {
    const { uid } = req.params;
    const { month, year } = req.query; // e.g., month=3, year=2026

    const user = await User.findByPk(uid);
    if (!user) return res.status(404).json({ error: 'Employee not found' });

    // Hierarchy/HR Authorization
    if (req.user.uid !== uid && !['hr', 'org-admin', 'system-admin'].includes(req.user.role)) {
       if (user.reportingManagerUid !== req.user.uid) {
         return res.status(403).json({ error: 'Access denied: Payroll privacy enforced.' });
       }
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // Last day of month
    const totalDaysInMonth = endDate.getDate();

    const attendanceRecords = await Attendance.findAll({
      where: {
        userId: uid,
        date: {
          [Op.between]: [startDate, endDate]
        }
      }
    });

    const presentDays = attendanceRecords.filter(r => r.status === 'present').length;
    const halfDays = attendanceRecords.filter(r => r.status === 'half-day').length;
    
    // Logic: 0.5 for half day
    const effectivePresentDays = presentDays + (halfDays * 0.5);

    const baseSalary = parseFloat(user.baseSalary || 0);
    const calculatedSalary = (effectivePresentDays / totalDaysInMonth) * baseSalary;

    res.json({
      uid,
      name: user.name,
      period: `${year}-${month}`,
      baseSalary,
      totalDaysInMonth,
      effectivePresentDays,
      calculatedSalary: calculatedSalary.toFixed(2),
      attendanceSummary: {
        present: presentDays,
        halfDay: halfDays,
        absent: attendanceRecords.filter(r => r.status === 'absent').length
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Leave Management (Workforce Health) ---

router.post('/leaves', verifyToken, async (req, res) => {
    try {
        const { type, fromDate, toDate, remarks } = req.body;
        const user = await User.findByPk(req.user.uid);
        
        const start = new Date(fromDate);
        const end = new Date(toDate);
        const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

        if (user.leaveBalance < diffDays) {
            return res.status(400).json({ error: `Validation Failure: Insufficient leave balance. Required: ${diffDays}, Available: ${user.leaveBalance}` });
        }

        const leave = await Leave.create({
            employeeId: req.user.uid,
            type,
            fromDate,
            toDate,
            status: 'pending_step1',
            remarks
        });

        res.status(201).json(leave);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/leaves/:id/approve', verifyToken, isHR, async (req, res) => {
    try {
        const { id } = req.params;
        const leave = await Leave.findByPk(id);
        if (!leave) return res.status(404).json({ error: 'Leave request not found' });

        const employee = await User.findByPk(leave.employeeId);
        
        const start = new Date(leave.fromDate);
        const end = new Date(leave.toDate);
        const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

        if (employee.leaveBalance < diffDays) {
            return res.status(400).json({ error: 'Compliance Violation: Employee has insufficient balance at approval time.' });
        }

        await employee.update({ leaveBalance: employee.leaveBalance - diffDays });
        await leave.update({ status: 'approved', step1By: req.user.uid });

        await logAction({
            userId: req.user.uid,
            action: 'APPROVE_LEAVE',
            entity: 'Leave',
            details: `Approved ${diffDays} days for ${employee.name}. Remaining: ${employee.leaveBalance}`,
            module: 'HR'
        });

        res.json({ message: 'Leave approved and balance deducted.', leave });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
