import express from 'express';
import { Op } from 'sequelize';
import { models, sequelize } from '../models/index.js';
import { verifyToken } from '../middleware/verifyToken.js';
import { logAction } from '../lib/audit.js';

const router = express.Router();
const {
  Target,
  TargetAssignment,
  IncentiveRule,
  IncentivePayout,
  User,
  Department,
  Student,
  Invoice,
  Task,
  Notification,
} = models;

const financeRoles = ['finance admin', 'organization admin', 'finance'];
const operationsRoles = ['operations admin', 'academic operations admin', 'academic operations administrator', 'operations administrator', 'organization admin'];
const salesRoles = ['sales admin', 'sales & crm admin', 'sales', 'employee'];

const isFinanceUser = (req, res, next) => {
  const role = req.user?.role?.toLowerCase()?.trim() || '';
  if (!financeRoles.includes(role)) {
    return res.status(403).json({ error: 'Finance access required' });
  }
  next();
};

const isOperationsUser = (req, res, next) => {
  const role = req.user?.role?.toLowerCase()?.trim() || '';
  if (!operationsRoles.includes(role)) {
    return res.status(403).json({ error: 'Operations access required' });
  }
  next();
};

const getSalesDeptIds = async () => {
  const salesDepts = await Department.findAll({
    where: {
      [Op.or]: [
        { type: 'sales' },
        { name: { [Op.like]: '%Sales%' } },
        { shortName: { [Op.like]: '%SAL%' } },
      ],
    },
    attributes: ['id'],
  });

  return salesDepts.map((dept) => dept.id);
};

const getSalesEmployees = async () => {
  const salesDeptIds = await getSalesDeptIds();
  return User.findAll({
    where: {
      status: 'active',
      [Op.or]: [
        { deptId: { [Op.in]: salesDeptIds.length ? salesDeptIds : [-1] } },
        { role: { [Op.in]: ['Sales Admin', 'Sales & CRM Admin', 'Employee'] } },
      ],
    },
    attributes: ['uid', 'name', 'email', 'role', 'deptId'],
    order: [['name', 'ASC']],
  });
};

const targetIncludes = [
  { model: IncentiveRule, as: 'rules' },
  {
    model: TargetAssignment,
    as: 'assignments',
    required: false,
    include: [
      { model: User, as: 'employee', attributes: ['uid', 'name', 'email', 'role'] },
      { model: Task, as: 'task', attributes: ['id', 'title', 'status', 'deadline', 'completedAt'] },
      { model: IncentivePayout, as: 'payout', required: false },
    ],
  },
];

const pickRewardAmount = (rules) => {
  const structure = rules?.[0]?.structure;
  if (!Array.isArray(structure) || structure.length === 0) return 0;
  return structure.reduce((max, rule) => Math.max(max, Number(rule?.reward || 0)), 0);
};

const notifyUsers = async (uids, payload) => {
  const uniqueUids = [...new Set((uids || []).filter(Boolean))];
  await Promise.all(uniqueUids.map((uid) => Notification.create({
    userUid: uid,
    type: payload.type || 'info',
    message: payload.title ? `${payload.title}: ${payload.message}` : payload.message,
    link: payload.link || null,
  })));
};

const getOperationsRecipients = async () => {
  const users = await User.findAll({
    where: {
      status: 'active',
      role: { [Op.in]: ['Operations Admin', 'Academic Operations Admin', 'Academic Operations Administrator', 'Organization Admin'] },
    },
    attributes: ['uid'],
  });
  return users.map((user) => user.uid);
};

const getFinanceRecipients = async () => {
  const users = await User.findAll({
    where: {
      status: 'active',
      role: { [Op.in]: ['Finance Admin', 'Organization Admin'] },
    },
    attributes: ['uid'],
  });
  return users.map((user) => user.uid);
};

export const syncTargetProgress = async (targetId) => {
  const assignments = await TargetAssignment.findAll({ where: { targetId } });
  if (!assignments.length) return;

  const statuses = assignments.map((assignment) => assignment.status);
  const allProcessed = statuses.every((status) => status === 'payout_processed');
  const allFinanceReviewed = statuses.every((status) => ['approved', 'denied', 'payout_processed'].includes(status));
  const allCompleted = statuses.every((status) => ['completed', 'approved', 'denied', 'payout_processed'].includes(status));

  let workflowStatus = 'live';
  let status = 'active';

  if (allProcessed) {
    workflowStatus = 'disbursed';
    status = 'completed';
  } else if (allFinanceReviewed) {
    workflowStatus = statuses.some((item) => ['approved', 'payout_processed'].includes(item)) ? 'approved_by_finance' : 'denied_by_finance';
    status = 'completed';
  } else if (allCompleted) {
    workflowStatus = 'under_finance_review';
    status = 'completed';
  }

  await Target.update({ workflowStatus, status }, { where: { id: targetId } });

  return {
    completed: assignments.filter((assignment) => ['completed', 'approved', 'denied', 'payout_processed'].includes(assignment.status)).length,
    total: assignments.length,
  };
};

router.post('/finance/targets', verifyToken, isFinanceUser, async (req, res) => {
  try {
    const {
      title,
      description,
      targetableType = 'department',
      targetableId = 'sales',
      metric,
      value,
      startDate,
      endDate,
      rules,
      financeRemarks,
      eligibilityCriteria,
      cycleName,
    } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ error: 'Target title is required' });
    }
    if (!metric || value === undefined || !startDate || !endDate) {
      return res.status(400).json({ error: 'Metric, value, start date, and end date are required' });
    }

    const target = await Target.create({
      title: title.trim(),
      description: description?.trim() || null,
      targetableType,
      targetableId,
      metric,
      value,
      startDate,
      endDate,
      status: 'active',
      workflowStatus: 'pending_operations',
      financeRemarks: financeRemarks?.trim() || null,
      eligibilityCriteria: eligibilityCriteria || null,
      cycleName: cycleName?.trim() || null,
      assignedBy: req.user.uid,
    });

    if (Array.isArray(rules) && rules.length > 0) {
      await IncentiveRule.create({
        targetId: target.id,
        structure: rules,
        type: 'flat',
      });
    }

    await logAction({
      userId: req.user.uid,
      action: 'CREATE_INCENTIVE_PLAN',
      entity: 'Target',
      details: `Finance created incentive plan ${target.title}`,
      module: 'Finance',
      remarks: financeRemarks || null,
    });

    const operationsRecipients = await getOperationsRecipients();
    await notifyUsers(operationsRecipients, {
      type: 'info',
      title: 'Incentive Plan Awaiting Operations',
      message: `${target.title} is ready for operations verification and assignment.`,
      link: '/dashboard/academic/incentives',
    });

    const created = await Target.findByPk(target.id, { include: targetIncludes });
    res.status(201).json(created);
  } catch (error) {
    console.error('Create finance target error:', error);
    res.status(400).json({ error: error.message || 'Failed to create target' });
  }
});

router.get('/finance/targets', verifyToken, isFinanceUser, async (req, res) => {
  try {
    const targets = await Target.findAll({
      include: targetIncludes,
      order: [['createdAt', 'DESC']],
    });
    res.json(targets);
  } catch (error) {
    console.error('Fetch finance targets error:', error);
    res.status(500).json({ error: 'Failed to load target pipeline' });
  }
});

router.get('/operations/targets', verifyToken, isOperationsUser, async (req, res) => {
  try {
    const targets = await Target.findAll({
      where: {
        workflowStatus: {
          [Op.in]: ['pending_operations', 'verified_by_operations', 'live', 'under_finance_review', 'approved_by_finance', 'denied_by_finance', 'disbursed'],
        },
      },
      include: targetIncludes,
      order: [['createdAt', 'DESC']],
    });
    res.json(targets);
  } catch (error) {
    console.error('Fetch operations incentive queue error:', error);
    res.status(500).json({ error: 'Failed to load operations incentive queue' });
  }
});

router.get('/operations/sales-employees', verifyToken, isOperationsUser, async (req, res) => {
  try {
    const employees = await getSalesEmployees();
    res.json(employees.filter((user) => salesRoles.includes(user.role?.toLowerCase?.().trim?.() || '')));
  } catch (error) {
    console.error('Fetch sales employees error:', error);
    res.status(500).json({ error: 'Failed to load sales employees' });
  }
});

router.put('/operations/targets/:id/decision', verifyToken, isOperationsUser, async (req, res) => {
  try {
    const { status, remarks } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be approved or rejected' });
    }

    const target = await Target.findByPk(req.params.id);
    if (!target) return res.status(404).json({ error: 'Target not found' });

    await target.update({
      workflowStatus: status === 'approved' ? 'verified_by_operations' : 'rejected_by_operations',
      status: status === 'approved' ? 'active' : 'cancelled',
      operationsUid: req.user.uid,
      operationsRemarks: remarks?.trim() || null,
      operationsDecisionAt: new Date(),
    });

    await logAction({
      userId: req.user.uid,
      action: status === 'approved' ? 'OPS_VERIFY_INCENTIVE_PLAN' : 'OPS_REJECT_INCENTIVE_PLAN',
      entity: 'Target',
      details: `Operations ${status} incentive plan ${target.title}`,
      module: 'Academic Operations',
      remarks: remarks || null,
    });

    const financeUsers = await getFinanceRecipients();
    await notifyUsers(financeUsers, {
      type: status === 'approved' ? 'success' : 'warning',
      title: `Incentive plan ${status}`,
      message: `${target.title || `Target #${target.id}`} was ${status} by Operations.`,
      link: '/dashboard/finance/performance',
    });

    const updated = await Target.findByPk(target.id, { include: targetIncludes });
    res.json(updated);
  } catch (error) {
    console.error('Operations target decision error:', error);
    res.status(500).json({ error: 'Failed to update target decision' });
  }
});

router.post('/operations/targets/:id/assign', verifyToken, isOperationsUser, async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { employeeUids, assignAll, deadline, title, description, priority = 'high', remarks } = req.body;

    const target = await Target.findByPk(req.params.id, {
      include: [{ model: IncentiveRule, as: 'rules' }],
      transaction,
    });

    if (!target) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Target not found' });
    }

    if (!['verified_by_operations', 'live'].includes(target.workflowStatus)) {
      await transaction.rollback();
      return res.status(409).json({ error: 'Target must be operations-verified before assignment' });
    }

    const employees = await getSalesEmployees();
    const employeeMap = new Map(employees.map((employee) => [employee.uid, employee]));
    const chosenEmployees = assignAll
      ? employees
      : (Array.isArray(employeeUids) ? employeeUids : []).map((uid) => employeeMap.get(uid)).filter(Boolean);

    if (chosenEmployees.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Select at least one sales employee' });
    }

    const existingAssignments = await TargetAssignment.findAll({
      where: { targetId: target.id },
      transaction,
    });
    const existingEmployeeUids = new Set(existingAssignments.map((assignment) => assignment.employeeUid));

    const assignmentRecords = [];
    for (const employee of chosenEmployees) {
      if (existingEmployeeUids.has(employee.uid)) continue;

      const task = await Task.create({
        assignedTo: employee.uid,
        assignedBy: req.user.uid,
        title: title?.trim() || target.title || `Sales Target #${target.id}`,
        description: description?.trim() || target.description || `Complete target ${target.metric} worth ${target.value}.`,
        deadline: deadline || target.endDate,
        priority,
        departmentId: employee.deptId || req.user.deptId || null,
        remarks: remarks?.trim() || null,
      }, {
        transaction,
        context: { assigner: req.user },
      });

      const assignment = await TargetAssignment.create({
        targetId: target.id,
        employeeUid: employee.uid,
        taskId: task.id,
        assignedBy: req.user.uid,
        remarks: remarks?.trim() || null,
      }, { transaction });

      assignmentRecords.push(assignment);

      await Notification.create({
        userUid: employee.uid,
        type: 'info',
        title: 'New Incentive Task',
        message: `${task.title} has been assigned with incentive eligibility on completion.`,
        link: '/dashboard/employee/tasks',
      }, { transaction });
    }

    await target.update({
      workflowStatus: 'live',
      status: 'active',
      operationsUid: req.user.uid,
    }, { transaction });

    await transaction.commit();

    await logAction({
      userId: req.user.uid,
      action: assignAll ? 'OPS_BULK_ASSIGN_INCENTIVE' : 'OPS_ASSIGN_INCENTIVE',
      entity: 'Target',
      details: `Operations assigned ${assignmentRecords.length} employee(s) to incentive plan ${target.title}`,
      module: 'Academic Operations',
      remarks: remarks || null,
    });

    const updated = await Target.findByPk(target.id, { include: targetIncludes });
    res.json({ message: 'Target assigned to sales employees', target: updated, assignments: assignmentRecords });
  } catch (error) {
    await transaction.rollback();
    console.error('Assign incentive target error:', error);
    res.status(500).json({ error: error.message || 'Failed to assign target' });
  }
});

// Compatibility read endpoints for the existing sales panel.
router.get('/sales-admin/targets', verifyToken, async (req, res) => {
  try {
    const targets = await Target.findAll({
      where: {
        workflowStatus: {
          [Op.in]: ['verified_by_operations', 'live', 'under_finance_review', 'approved_by_finance', 'denied_by_finance', 'disbursed'],
        },
      },
      include: targetIncludes,
      order: [['createdAt', 'DESC']],
    });
    res.json(targets);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load target workflow' });
  }
});

router.get('/sales-admin/employees', verifyToken, async (req, res) => {
  try {
    const employees = await getSalesEmployees();
    res.json(employees);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load sales employees' });
  }
});

router.get('/achievement/:targetId', verifyToken, async (req, res) => {
  try {
    const target = await Target.findByPk(req.params.targetId, {
      include: [
        { model: IncentiveRule, as: 'rules' },
        { model: TargetAssignment, as: 'assignments', include: [{ model: Task, as: 'task' }, { model: User, as: 'employee', attributes: ['uid', 'name'] }] },
      ],
    });
    if (!target) return res.status(404).json({ error: 'Target not found' });

    if (target.assignments?.length) {
      const current = target.assignments.filter((assignment) => {
        const taskStatus = assignment.task?.status;
        return ['completed', 'approved', 'payout_processed'].includes(assignment.status) || taskStatus === 'completed';
      }).length;
      const percentage = target.assignments.length ? (current / target.assignments.length) * 100 : 0;
      const employees = target.assignments.map((assignment) => ({
        assignmentId: assignment.id,
        employeeUid: assignment.employeeUid,
        employeeName: assignment.employee?.name || assignment.employeeUid,
        taskTitle: assignment.task?.title || null,
        taskStatus: assignment.task?.status || assignment.status,
        assignmentStatus: assignment.status,
        completedAt: assignment.completedAt || assignment.task?.completedAt || null,
      }));
      return res.json({ target, current, percentage, employees });
    }

    let current = 0;
    if (target.metric === 'enrollment') {
      current = await Student.count({
        where: {
          createdAt: { [Op.between]: [target.startDate, target.endDate] },
        },
      });
    } else if (target.metric === 'revenue') {
      const invoices = await Invoice.findAll({
        where: {
          createdAt: { [Op.between]: [target.startDate, target.endDate] },
          status: 'paid',
        },
      });
      current = invoices.reduce((sum, inv) => sum + parseFloat(inv.totalAmount || inv.total || 0), 0);
    }

    const percentage = Number(target.value) ? (current / Number(target.value)) * 100 : 0;
    res.json({ target, current, percentage });
  } catch (error) {
    console.error('Fetch target achievement error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/my-targets', verifyToken, async (req, res) => {
  try {
    const assignments = await TargetAssignment.findAll({
      where: { employeeUid: req.user.uid },
      include: [
        {
          model: Target,
          as: 'target',
          include: [{ model: IncentiveRule, as: 'rules' }],
        },
        { model: Task, as: 'task', attributes: ['id', 'title', 'description', 'status', 'deadline', 'completedAt'] },
        { model: IncentivePayout, as: 'payout', required: false },
      ],
      order: [['createdAt', 'DESC']],
    });

    const syncedAssignments = await Promise.all(assignments.map(async (assignment) => {
      if (assignment.task?.status === 'completed' && assignment.status === 'assigned') {
        await assignment.update({
          status: 'completed',
          completedAt: assignment.task.completedAt || new Date(),
        });
        await syncTargetProgress(assignment.targetId);
      }
      return assignment.reload({
        include: [
          {
            model: Target,
            as: 'target',
            include: [{ model: IncentiveRule, as: 'rules' }],
          },
          { model: Task, as: 'task', attributes: ['id', 'title', 'description', 'status', 'deadline', 'completedAt'] },
          { model: IncentivePayout, as: 'payout', required: false },
        ],
      });
    }));

    res.json(syncedAssignments);
  } catch (error) {
    console.error('Fetch my targets error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/finance/targets/:id/reward-preview', verifyToken, isFinanceUser, async (req, res) => {
  try {
    const target = await Target.findByPk(req.params.id, { include: [{ model: IncentiveRule, as: 'rules' }] });
    if (!target) return res.status(404).json({ error: 'Target not found' });

    res.json({
      targetId: target.id,
      rewardAmount: pickRewardAmount(target.rules),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate reward preview' });
  }
});

export default router;
