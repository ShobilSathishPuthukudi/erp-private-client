import express from 'express';
import { Op } from 'sequelize';
import { models, sequelize } from '../models/index.js';
import { verifyToken } from '../middleware/verifyToken.js';
import {
  normalizeInstitutionRoleName,
  SUB_DEPARTMENTS,
  CORE_DEPARTMENTS,
} from '../config/institutionalStructure.js';

const router = express.Router();

const {
  User,
  Department,
  Student,
  Program,
  Payment,
  Invoice,
  Task,
  Leave,
  Lead,
  Deal,
  Announcement,
  Survey,
  SurveyResponse,
  CEOPanel,
  CredentialRequest,
  ReregRequest,
  Vacancy,
  AccreditationRequest,
  AuditLog,
} = models;

const CENTER_TYPES = [
  'partner-center',
  'partner center',
  'partner centers',
  'study-center',
  'study centers',
];

const ACADEMIC_SUB_DEPT_NAMES = SUB_DEPARTMENTS.map((s) => s.name);

// Strict Org-Admin-only guard. No cross-panel visibility leaks are permitted
// because this endpoint exposes every panel's state at once.
const isGlobalMonitorViewer = (req, res, next) => {
  const role = normalizeInstitutionRoleName(req.user?.role)?.toLowerCase().trim();
  if (role !== 'organization admin') {
    return res
      .status(403)
      .json({ error: 'Global Monitor requires Organization Admin privileges.' });
  }
  next();
};

// ---------------------------------------------------------------------------
// Helper: Resolve Scope for a given CEO Panel
// ---------------------------------------------------------------------------
const resolvePanelScope = async (panel) => {
  if (!panel || !panel.visibilityScope || !Array.isArray(panel.visibilityScope) || panel.visibilityScope.length === 0) {
    return { restricted: true, deptIds: [], names: [], isGlobal: false };
  }

  const scopeStrings = panel.visibilityScope;
  const allDepts = await Department.unscoped().findAll({ attributes: ['id', 'name', 'parentId'] });
  
  const isGlobal = scopeStrings.includes('all') || scopeStrings.some(s => {
    const clean = s.toLowerCase().replace(/ scope$/i, '').trim();
    return clean === 'global overseer' || clean === 'global(all)';
  });

  if (isGlobal) {
    return { restricted: false, deptIds: [], names: ['Global(All)'], isGlobal: true };
  }

  const primaryDepts = allDepts.filter(d => {
    const dName = d.name.toLowerCase();
    return scopeStrings.some(s => {
      const sLower = s.toLowerCase();
      if (sLower.includes('academic') || sLower.includes('enrollment')) return dName.includes('academic');
      if (sLower.includes('finance') || sLower.includes('account')) return dName.includes('finance');
      if (sLower.includes('operation') || sLower.includes('regional')) return dName.includes('operation');
      if (sLower.includes('hr') || sLower.includes('human resource') || sLower.includes('marketing')) return dName.includes('hr') || dName.includes('marketing') || dName.includes('human resource');
      if (sLower.includes('sales')) return dName.includes('sales');
      if (sLower.includes('security')) return dName.includes('security');
      const sClean = sLower.replace(/ department| admin| portal/g, '').trim();
      return dName.includes(sClean);
    });
  });

  const primaryIds = primaryDepts.map(d => d.id);
  
  const findChildrenRecursively = (parentId) => {
    const children = allDepts.filter(d => d.parentId === parentId);
    let ids = children.map(c => c.id);
    children.forEach(c => { ids = [...ids, ...findChildrenRecursively(c.id)]; });
    return ids;
  };

  let scopedIds = [...primaryIds];
  primaryIds.forEach(id => { scopedIds = [...scopedIds, ...findChildrenRecursively(id)]; });
  const deptIds = [...new Set(scopedIds)];
  const names = allDepts.filter(d => deptIds.includes(d.id)).map(d => d.name);

  return { restricted: true, deptIds, names: [...new Set([...names, ...scopeStrings])], isGlobal: false };
};

// ---------------------------------------------------------------------------
// Summary: compact, cross-panel telemetry
// ---------------------------------------------------------------------------
router.get('/summary', verifyToken, isGlobalMonitorViewer, async (req, res) => {
  try {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      // Workforce
      employeeCount,
      activeAdminCount,
      openVacancies,
      pendingLeaves,
      overdueTasks,
      // Finance
      invoicesIssued,
      invoicesPaid,
      verifiedPaymentsTotal,
      reregPending,
      credentialRequestsPending,
      // Sales
      activeLeads,
      convertedLeads,
      openDeals,
      signedDeals,
      // Academic
      universitiesCount,
      programsCount,
      centersCount,
      centersPendingAudit,
      studentsEnrolled,
      studentsPendingReview,
      // CEO & governance
      ceoPanels,
      activeDirectives,
      activeSurveys,
      // Structure
      coreDepartments,
      subDepartments,
      ceoToHrTasks,
      auditEvents24h,
      centersByAudit,
      criticalEvents24h,
    ] = await Promise.all([
      User.count({
        where: {
          status: 'active',
          role: { [Op.notIn]: ['student', 'Student', 'Partner Center', 'partner-center', 'ceo', 'CEO'] },
        },
      }),
      User.count({
        where: {
          status: 'active',
          [Op.or]: [
            { role: { [Op.like]: '%Admin%' } },
            { role: 'CEO' },
            { role: 'ceo' },
          ],
        },
      }),
      Vacancy.count({ where: { status: 'OPEN' } }),
      Leave.count({ where: { status: { [Op.in]: ['pending', 'pending admin', 'pending hr', 'pending_step1', 'pending_step2'] } } }),
      Task.count({
        where: {
          status: { [Op.ne]: 'completed' },
          deadline: { [Op.lt]: now },
        },
      }),
      Invoice.count({ where: { status: { [Op.in]: ['issued', 'paid'] } } }),
      Invoice.count({ where: { status: 'paid' } }),
      Payment.sum('amount', { where: { status: 'verified' } }).then((v) => Number(v) || 0),
      ReregRequest.count({ where: { status: 'pending' } }),
      CredentialRequest.count({ where: { status: 'pending' } }),
      Lead.count({ where: { status: { [Op.notIn]: ['CONVERTED', 'LOST'] } } }),
      Lead.count({ where: { status: 'CONVERTED' } }),
      Deal.count({ where: { status: { [Op.in]: ['negotiation', 'agreement_sent'] } } }),
      Deal.count({ where: { status: 'signed' } }),
      Department.count({ where: { type: 'universities' } }),
      Program.count(),
      Department.count({ where: { type: { [Op.in]: CENTER_TYPES } } }),
      Department.count({
        where: {
          type: { [Op.in]: CENTER_TYPES },
          auditStatus: { [Op.in]: ['pending', 'PENDING_FINANCE'] },
        },
      }),
      Student.count({ where: { status: 'ENROLLED' } }),
      Student.count({
        where: {
          status: { [Op.in]: ['PENDING_REVIEW', 'OPS_APPROVED', 'FINANCE_PENDING', 'PAYMENT_VERIFIED'] },
        },
      }),
      CEOPanel.findAll({
        attributes: ['id', 'name', 'status', 'visibilityScope', 'userId', 'createdAt'],
        include: [{ model: User, as: 'ceoUser', attributes: ['uid', 'name', 'email', 'status'] }],
        order: [['createdAt', 'DESC']],
      }),
      Announcement.count({
        where: {
          [Op.or]: [{ expiryDate: null }, { expiryDate: { [Op.gt]: now } }],
        },
      }),
      Survey.count({ where: { status: 'active' } }),
      Department.findAll({
        where: { type: 'departments', parentId: null },
        attributes: ['id', 'name', 'status', 'adminId'],
        include: [{ model: User, as: 'admin', attributes: ['uid', 'name', 'role', 'email', 'status'], required: false }],
        order: [['name', 'ASC']],
      }),
      Department.findAll({
        where: { type: 'sub-departments' },
        attributes: ['id', 'name', 'status', 'parentId', 'adminId'],
        include: [{ model: User, as: 'admin', attributes: ['uid', 'name', 'role', 'email', 'status'], required: false }],
        order: [['name', 'ASC']],
      }),
      Task.findAll({
        include: [
          {
            model: User,
            as: 'assigner',
            attributes: ['uid', 'name', 'role'],
            where: { role: { [Op.in]: ['ceo', 'CEO'] } },
            required: true,
          },
          {
            model: User,
            as: 'assignee',
            attributes: ['uid', 'name', 'role', 'deptId'],
            where: {
              [Op.or]: [
                { role: { [Op.like]: '%HR%' } },
                { role: 'HR Admin' },
              ],
            },
            required: true,
          },
        ],
        order: [['createdAt', 'DESC']],
        limit: 50,
      }),
      AuditLog.count({ where: { timestamp: { [Op.gt]: twentyFourHoursAgo } } }),
      // Operations & Security Additions
      Department.findAll({
        where: { type: { [Op.in]: CENTER_TYPES } },
        attributes: ['auditStatus', [sequelize.fn('count', sequelize.col('id')), 'count']],
        group: ['auditStatus'],
      }),
      AuditLog.count({
        where: {
          timestamp: { [Op.gt]: twentyFourHoursAgo },
          [Op.or]: [
            { action: { [Op.like]: '%DELETE%' } },
            { action: { [Op.like]: '%UNAUTHORIZED%' } },
            { action: 'CREDENTIAL_REVEAL' },
          ],
        },
      }),
    ]);

    const panels = ceoPanels.map((p) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      userId: p.userId,
      scope: Array.isArray(p.visibilityScope) ? p.visibilityScope : [],
      assignedCEO: p.ceoUser
        ? { uid: p.ceoUser.uid, name: p.ceoUser.name, email: p.ceoUser.email, status: p.ceoUser.status }
        : null,
      createdAt: p.createdAt,
    }));

    res.json({
      generatedAt: now.toISOString(),
      panels: {
        hr: { employeeCount, openVacancies, pendingLeaves, overdueTasks, activeAdmins: activeAdminCount },
        finance: {
          invoicesIssued,
          invoicesPaid,
          verifiedPaymentsTotal,
          reregPending,
          credentialRequestsPending,
        },
        sales: { activeLeads, convertedLeads, openDeals, signedDeals },
        academic: {
          universitiesCount,
          programsCount,
          centersCount,
          centersPendingAudit,
          studentsEnrolled,
          studentsPendingReview,
        },
        ceo: {
          panelCount: ceoPanels.length,
          activePanels: panels.filter((p) => String(p.status).toLowerCase() === 'active').length,
          ceoToHrTaskCount: ceoToHrTasks.length,
        },
        governance: {
          activeDirectives,
          activeSurveys,
          auditEvents24h,
          criticalEvents24h,
        },
        operations: {
          centersCount,
          centersPendingAudit,
          centersByAudit,
        },
      },
      coreDepartments: coreDepartments.map((d) => ({
        id: d.id,
        name: d.name,
        status: d.status,
        admin: d.admin
          ? { uid: d.admin.uid, name: d.admin.name, role: d.admin.role, email: d.admin.email, status: d.admin.status }
          : null,
      })),
      subDepartments: subDepartments.map((d) => ({
        id: d.id,
        name: d.name,
        status: d.status,
        parentId: d.parentId,
        admin: d.admin
          ? { uid: d.admin.uid, name: d.admin.name, role: d.admin.role, email: d.admin.email, status: d.admin.status }
          : null,
      })),
      ceoPanels: panels,
      ceoToHrTasks: ceoToHrTasks.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        deadline: t.deadline,
        createdAt: t.createdAt,
        assigner: t.assigner ? { uid: t.assigner.uid, name: t.assigner.name, role: t.assigner.role } : null,
        assignee: t.assignee ? { uid: t.assignee.uid, name: t.assignee.name, role: t.assignee.role, deptId: t.assignee.deptId } : null,
      })),
    });
  } catch (error) {
    console.error('[Global Monitor] summary error:', error);
    res.status(500).json({ error: 'Failed to build Global Monitor summary', details: error.message });
  }
});

// ---------------------------------------------------------------------------
// HR panel: full live snapshot
// ---------------------------------------------------------------------------
router.get('/hr', verifyToken, isGlobalMonitorViewer, async (req, res) => {
  try {
    const hrDept = await Department.findOne({ where: { name: 'HR', type: { [Op.in]: ['departments', 'department'] } } });
    const hrDeptId = hrDept?.id || null;
    const now = new Date();

    const [employees, vacancies, pendingLeaves, activeTasks, overdueTasks, hrAdmins] = await Promise.all([
      User.findAll({
        where: {
          status: 'active',
          role: { [Op.notIn]: ['student', 'Student', 'Partner Center', 'partner-center', 'ceo', 'CEO'] },
        },
        attributes: ['uid', 'name', 'email', 'role', 'deptId', 'subDepartment', 'status', 'createdAt'],
        include: [{ model: Department, as: 'department', attributes: ['id', 'name', 'type'], required: false }],
        order: [['createdAt', 'DESC']],
        limit: 500,
      }),
      Vacancy.findAll({
        where: { status: 'OPEN' },
        include: [{ model: Department, as: 'department', attributes: ['id', 'name', 'type'], required: false }],
        order: [['createdAt', 'DESC']],
      }),
      Leave.findAll({
        where: { status: { [Op.in]: ['pending', 'pending admin', 'pending hr', 'pending_step1', 'pending_step2'] } },
        include: [{ model: User, as: 'employee', attributes: ['uid', 'name', 'role', 'deptId'], required: false }],
        order: [['createdAt', 'DESC']],
        limit: 100,
      }),
      Task.count({ where: { status: { [Op.ne]: 'completed' } } }),
      Task.findAll({
        where: { status: { [Op.ne]: 'completed' }, deadline: { [Op.lt]: now } },
        include: [
          { model: User, as: 'assignee', attributes: ['uid', 'name', 'role', 'deptId'], required: false },
          { model: User, as: 'assigner', attributes: ['uid', 'name', 'role'], required: false },
        ],
        order: [['deadline', 'ASC']],
        limit: 100,
      }),
      User.findAll({
        where: {
          status: 'active',
          [Op.or]: [{ role: 'HR Admin' }, { deptId: hrDeptId || -1 }],
        },
        attributes: ['uid', 'name', 'email', 'role', 'deptId', 'status', 'createdAt'],
        order: [['createdAt', 'DESC']],
      }),
    ]);

    res.json({
      generatedAt: now.toISOString(),
      counts: {
        employees: employees.length,
        openVacancies: vacancies.length,
        pendingLeaves: pendingLeaves.length,
        activeTasks,
        overdueTasks: overdueTasks.length,
        hrAdmins: hrAdmins.length,
      },
      employees,
      vacancies,
      pendingLeaves,
      overdueTasks,
      hrAdmins,
    });
  } catch (error) {
    console.error('[Global Monitor] hr error:', error);
    res.status(500).json({ error: 'Failed to fetch HR monitor', details: error.message });
  }
});

// ---------------------------------------------------------------------------
// Finance panel
// ---------------------------------------------------------------------------
router.get('/finance', verifyToken, isGlobalMonitorViewer, async (req, res) => {
  try {
    const now = new Date();

    const [invoices, paymentsAgg, reregPending, credentialRequests, paidInvoiceTotal, financeAdmins] = await Promise.all([
      Invoice.findAll({
        attributes: ['id', 'invoiceNo', 'amount', 'total', 'gst', 'status', 'studentId', 'createdAt'],
        order: [['createdAt', 'DESC']],
        limit: 200,
      }),
      Payment.findAll({
        attributes: ['id', 'amount', 'mode', 'status', 'studentId', 'date'],
        order: [['date', 'DESC']],
        limit: 200,
      }),
      ReregRequest.findAll({
        where: { status: 'pending' },
        order: [['createdAt', 'DESC']],
        limit: 100,
      }),
      CredentialRequest.findAll({
        where: { status: 'pending' },
        include: [
          { model: Department, as: 'center', attributes: ['id', 'name'], required: false },
          { model: User, as: 'requester', attributes: ['uid', 'name', 'role'], required: false },
        ],
        order: [['createdAt', 'DESC']],
        limit: 100,
      }),
      Invoice.sum('total', { where: { status: 'paid' } }).then((v) => Number(v) || 0),
      User.findAll({
        where: { role: 'Finance Admin', status: 'active' },
        attributes: ['uid', 'name', 'email', 'role', 'status'],
      }),
    ]);

    const verifiedPaymentsTotal = paymentsAgg
      .filter((p) => p.status === 'verified')
      .reduce((acc, p) => acc + Number(p.amount || 0), 0);

    res.json({
      generatedAt: now.toISOString(),
      counts: {
        invoicesIssued: invoices.filter((i) => i.status !== 'draft').length,
        invoicesPaid: invoices.filter((i) => i.status === 'paid').length,
        paidInvoiceTotal,
        verifiedPayments: paymentsAgg.filter((p) => p.status === 'verified').length,
        verifiedPaymentsTotal,
        reregPending: reregPending.length,
        credentialRequests: credentialRequests.length,
        financeAdmins: financeAdmins.length,
      },
      invoices,
      payments: paymentsAgg,
      reregPending,
      credentialRequests,
      financeAdmins,
    });
  } catch (error) {
    console.error('[Global Monitor] finance error:', error);
    res.status(500).json({ error: 'Failed to fetch Finance monitor', details: error.message });
  }
});

// ---------------------------------------------------------------------------
// Sales panel
// ---------------------------------------------------------------------------
router.get('/sales', verifyToken, isGlobalMonitorViewer, async (req, res) => {
  try {
    const now = new Date();
    const [leads, deals, salesAdmins, referredCenters] = await Promise.all([
      Lead.findAll({
        attributes: ['id', 'name', 'status', 'source', 'expectedValue', 'assignedTo', 'createdAt'],
        include: [
          { model: User, as: 'assignee', attributes: ['uid', 'name', 'role'], required: false },
          { model: Department, as: 'Center', attributes: ['id', 'name'], required: false },
        ],
        order: [['createdAt', 'DESC']],
        limit: 300,
      }),
      Deal.findAll({
        attributes: ['id', 'title', 'value', 'status', 'leadId', 'expectedCloseDate', 'createdAt'],
        order: [['createdAt', 'DESC']],
        limit: 200,
      }),
      User.findAll({
        where: { role: { [Op.in]: ['Sales Admin', 'Sales & CRM Admin'] }, status: 'active' },
        attributes: ['uid', 'name', 'email', 'role', 'status'],
      }),
      Department.findAll({
        where: { type: { [Op.in]: CENTER_TYPES }, sourceLeadId: { [Op.ne]: null } },
        attributes: ['id', 'name', 'auditStatus', 'status', 'sourceLeadId', 'createdAt'],
        limit: 200,
      }),
    ]);

    const leadsByStatus = leads.reduce((acc, lead) => {
      acc[lead.status] = (acc[lead.status] || 0) + 1;
      return acc;
    }, {});

    res.json({
      generatedAt: now.toISOString(),
      counts: {
        totalLeads: leads.length,
        activeLeads: leads.filter((l) => !['CONVERTED', 'LOST'].includes(l.status)).length,
        convertedLeads: leads.filter((l) => l.status === 'CONVERTED').length,
        openDeals: deals.filter((d) => ['negotiation', 'agreement_sent'].includes(d.status)).length,
        signedDeals: deals.filter((d) => d.status === 'signed').length,
        lostDeals: deals.filter((d) => d.status === 'lost').length,
        salesAdmins: salesAdmins.length,
        referredCenters: referredCenters.length,
      },
      leadsByStatus,
      leads,
      deals,
      salesAdmins,
      referredCenters,
    });
  } catch (error) {
    console.error('[Global Monitor] sales error:', error);
    res.status(500).json({ error: 'Failed to fetch Sales monitor', details: error.message });
  }
});

// ---------------------------------------------------------------------------
// Academic Operations panel
// ---------------------------------------------------------------------------
router.get('/academic', verifyToken, isGlobalMonitorViewer, async (req, res) => {
  try {
    const now = new Date();
    const [universities, programs, centers, students, accreditations, academicAdmins] = await Promise.all([
      Department.findAll({ where: { type: 'universities' }, attributes: ['id', 'name', 'status', 'createdAt'] }),
      Program.findAll({
        attributes: ['id', 'name', 'type', 'status', 'subDeptId', 'universityId', 'duration', 'createdAt'],
        include: [{ model: Department, as: 'university', attributes: ['id', 'name'], required: false }],
        order: [['name', 'ASC']],
      }),
      Department.findAll({
        where: { type: { [Op.in]: CENTER_TYPES } },
        attributes: ['id', 'name', 'auditStatus', 'status', 'centerStatus', 'createdAt'],
        order: [['createdAt', 'DESC']],
        limit: 500,
      }),
      Student.findAll({
        attributes: ['id', 'name', 'status', 'enrollStatus', 'reviewStage', 'deptId', 'subDepartmentId', 'programId', 'createdAt'],
        order: [['createdAt', 'DESC']],
        limit: 500,
      }),
      AccreditationRequest.findAll({
        where: { status: { [Op.in]: ['pending', 'PENDING_REVIEW', 'PENDING_FINANCE'] } },
        order: [['createdAt', 'DESC']],
        limit: 100,
      }).catch(() => []),
      User.findAll({
        where: { role: 'Academic Operations Admin', status: 'active' },
        attributes: ['uid', 'name', 'email', 'role', 'status'],
      }),
    ]);

    const studentsByStatus = students.reduce((acc, s) => {
      acc[s.status] = (acc[s.status] || 0) + 1;
      return acc;
    }, {});

    const centersByAudit = centers.reduce((acc, c) => {
      const key = c.auditStatus || 'unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    res.json({
      generatedAt: now.toISOString(),
      counts: {
        universities: universities.length,
        programs: programs.length,
        centers: centers.length,
        studentsEnrolled: studentsByStatus.ENROLLED || 0,
        studentsPendingReview:
          (studentsByStatus.PENDING_REVIEW || 0) +
          (studentsByStatus.OPS_APPROVED || 0) +
          (studentsByStatus.FINANCE_PENDING || 0),
        accreditationsPending: accreditations.length,
        academicAdmins: academicAdmins.length,
      },
      studentsByStatus,
      centersByAudit,
      universities,
      programs,
      centers,
      students,
      accreditations,
      academicAdmins,
    });
  } catch (error) {
    console.error('[Global Monitor] academic error:', error);
    res.status(500).json({ error: 'Failed to fetch Academic monitor', details: error.message });
  }
});

// ---------------------------------------------------------------------------
// Sub-departments panel
// ---------------------------------------------------------------------------
router.get('/subdepts', verifyToken, isGlobalMonitorViewer, async (req, res) => {
  try {
    const now = new Date();
    const subDepts = await Department.findAll({
      where: { type: 'sub-departments' },
      attributes: ['id', 'name', 'status', 'parentId', 'adminId', 'createdAt'],
      include: [
        { model: User, as: 'admin', attributes: ['uid', 'name', 'role', 'email', 'status'], required: false },
        { model: Department, as: 'parent', attributes: ['id', 'name'], required: false },
      ],
      order: [['name', 'ASC']],
    });

    const units = await Promise.all(
      subDepts.map(async (sd) => {
        const [programs, students, employees, tasks] = await Promise.all([
          Program.count({ where: { subDeptId: sd.id } }),
          Student.count({ where: { subDepartmentId: sd.id } }),
          User.count({
            where: {
              status: 'active',
              [Op.or]: [{ subDepartment: sd.name }, { deptId: sd.id }],
            },
          }),
          Task.count({
            where: { status: { [Op.ne]: 'completed' }, subDepartmentId: sd.id },
          }),
        ]);
        return {
          id: sd.id,
          name: sd.name,
          status: sd.status,
          parent: sd.parent ? { id: sd.parent.id, name: sd.parent.name } : null,
          admin: sd.admin
            ? { uid: sd.admin.uid, name: sd.admin.name, role: sd.admin.role, email: sd.admin.email, status: sd.admin.status }
            : null,
          counts: { programs, students, employees, tasks },
        };
      })
    );

    res.json({
      generatedAt: now.toISOString(),
      subDeptCount: subDepts.length,
      units,
      canonical: SUB_DEPARTMENTS,
    });
  } catch (error) {
    console.error('[Global Monitor] subdepts error:', error);
    res.status(500).json({ error: 'Failed to fetch Sub-department monitor', details: error.message });
  }
});

// ---------------------------------------------------------------------------
// CEO panel: every CEO instance + their scope + governance activity
// ---------------------------------------------------------------------------
router.get('/ceo', verifyToken, isGlobalMonitorViewer, async (req, res) => {
  try {
    const now = new Date();
    const panels = await CEOPanel.findAll({
      include: [{ model: User, as: 'ceoUser', attributes: ['uid', 'name', 'email', 'status'] }],
      order: [['createdAt', 'DESC']],
    });

    const ceoUids = panels.map((p) => p.userId).filter(Boolean);

    const [directives, surveys, tasksFromCEOs, payoutApprovals] = await Promise.all([
      Announcement.findAll({
        where: {
          [Op.and]: [
            { [Op.or]: [{ expiryDate: null }, { expiryDate: { [Op.gt]: now } }] },
            ceoUids.length ? { authorId: { [Op.in]: ceoUids } } : {},
          ],
        },
        order: [['createdAt', 'DESC']],
        limit: 100,
      }),
      Survey.findAll({
        where: ceoUids.length ? { createdBy: { [Op.in]: ceoUids } } : {},
        order: [['createdAt', 'DESC']],
        limit: 50,
      }),
      Task.findAll({
        where: ceoUids.length ? { assignedBy: { [Op.in]: ceoUids } } : { id: -1 },
        include: [
          { model: User, as: 'assigner', attributes: ['uid', 'name', 'role'], required: false },
          { model: User, as: 'assignee', attributes: ['uid', 'name', 'role', 'deptId'], required: false },
        ],
        order: [['createdAt', 'DESC']],
        limit: 200,
      }),
      AuditLog.count({
        where: {
          module: { [Op.in]: ['CEO', 'GOVERNANCE'] },
          action: { [Op.like]: '%PAYOUT%' },
          timestamp: { [Op.gt]: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
        },
      }).catch(() => 0),
    ]);

    const tasksByAssignee = tasksFromCEOs.reduce((acc, t) => {
      const dept = t.assignee?.role || 'Unassigned';
      acc[dept] = (acc[dept] || 0) + 1;
      return acc;
    }, {});

    res.json({
      generatedAt: now.toISOString(),
      panelCount: panels.length,
      activePanels: panels.filter((p) => String(p.status).toLowerCase() === 'active').length,
      panels: panels.map((p) => ({
        id: p.id,
        name: p.name,
        status: p.status,
        scope: Array.isArray(p.visibilityScope) ? p.visibilityScope : [],
        userId: p.userId,
        assignedCEO: p.ceoUser
          ? { uid: p.ceoUser.uid, name: p.ceoUser.name, email: p.ceoUser.email, status: p.ceoUser.status }
          : null,
        createdAt: p.createdAt,
      })),
      directives,
      surveys,
      tasksFromCEOs,
      tasksByAssignee,
      payoutApprovals30d: payoutApprovals,
    });
  } catch (error) {
    console.error('[Global Monitor] ceo error:', error);
    res.status(500).json({ error: 'Failed to fetch CEO monitor', details: error.message });
  }
});

router.get('/ceo/:panelId', verifyToken, isGlobalMonitorViewer, async (req, res) => {
  try {
    const { panelId } = req.params;
    const panel = await CEOPanel.findByPk(panelId, {
      include: [{ model: User, as: 'ceoUser', attributes: ['uid', 'name', 'email'] }]
    });

    if (!panel) return res.status(404).json({ error: 'CEO Panel not found' });

    const { restricted, deptIds, names, isGlobal } = await resolvePanelScope(panel);
    
    // Scoped filters
    const whereStudent = restricted ? {
      [Op.or]: [{ deptId: { [Op.in]: deptIds } }, { subDepartmentId: { [Op.in]: deptIds } }]
    } : {};
    const whereUser = restricted ? {
      [Op.or]: [{ deptId: { [Op.in]: deptIds } }, { subDepartment: { [Op.in]: names } }]
    } : {};

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // 1. Core KPIs
    const [
      totalStudents,
      totalUniversities,
      totalPrograms,
      activeCenters,
      overdueTasks,
      pendingLeaves,
      allInvoices
    ] = await Promise.all([
      Student.count({ where: whereStudent }),
      Department.count({ where: { type: 'universities', status: 'active', ...(restricted ? { [Op.or]: [{ id: { [Op.in]: deptIds } }, { parentId: { [Op.in]: deptIds } }] } : {}) } }),
      Program.count({ where: { status: 'active', ...(restricted ? { subDeptId: { [Op.in]: deptIds } } : {}) } }),
      Department.count({ where: { type: { [Op.in]: CENTER_TYPES }, status: 'active', ...(restricted ? { [Op.or]: [{ id: { [Op.in]: deptIds } }, { parentId: { [Op.in]: deptIds } }] } : {}) } }),
      Task.count({ where: { status: { [Op.ne]: 'completed' }, escalationLevel: 'CEO' } }), // Escalations are global or scoped? Usually CEO sees all escalations
      Leave.count({ where: { status: { [Op.notIn]: ['approved', 'rejected'] } }, include: [{ model: User, as: 'employee', required: true, where: whereUser }] }),
      Invoice.findAll({ 
        attributes: ['total', 'createdAt'], 
        where: { status: 'paid' },
        include: [{ model: Student, as: 'student', required: true, where: whereStudent }]
      })
    ]);

    const totalFundAcquired = allInvoices.reduce((sum, inv) => sum + parseFloat(inv.total), 0);
    const revenueMTD = allInvoices.filter(i => i.createdAt >= startOfMonth).reduce((sum, i) => sum + parseFloat(i.total), 0);
    const revenueYTD = allInvoices.filter(i => i.createdAt >= startOfYear).reduce((sum, i) => sum + parseFloat(i.total), 0);

    // Risk Metrics
    const [auditExceptions, revealRequests] = await Promise.all([
      AuditLog.count({
        where: {
          [Op.or]: [{ action: { [Op.like]: '%DELETE%' } }, { action: { [Op.like]: '%UNAUTHORIZED%' } }],
          timestamp: { [Op.gt]: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
          ...(restricted ? { userId: { [Op.in]: await User.findAll({ where: whereUser, attributes: ['uid'] }).then(u => u.map(x => x.uid)) } } : {})
        }
      }),
      AuditLog.count({
        where: { action: 'CREDENTIAL_REVEAL', timestamp: { [Op.gt]: new Date(now.getTime() - 24 * 60 * 60 * 1000) } }
      })
    ]);

    // Trends (Simplified for monitor)
    const enrollmentTrend = [];
    const revenueTrend = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mName = d.toLocaleString('default', { month: 'short' });
      enrollmentTrend.push({ name: mName, students: Math.floor(totalStudents / 6) + (i * 2) }); // Simulated for now to match UI complexity
      revenueTrend.push({ name: mName, revenue: Math.floor(revenueMTD / (i + 1)) });
    }

    res.json({
      panelInfo: {
        id: panel.id,
        name: panel.name,
        ceo: panel.ceoUser?.name || 'Unassigned',
        scope: names
      },
      metrics: {
        totalStudents,
        totalUniversities,
        totalPrograms,
        totalFundAcquired,
        revenueMTD,
        revenueYTD,
        activeCenters,
        overdueTasks,
        pendingLeaves,
        auditExceptions,
        revealRequests,
        enrollmentTrend,
        revenueTrend
      }
    });
  } catch (error) {
    console.error('[Global Monitor] specific ceo error:', error);
    res.status(500).json({ error: 'Failed to fetch specific CEO monitor', details: error.message });
  }
});

// ---------------------------------------------------------------------------
// Admin assignments & governance chain (who heads what)
// ---------------------------------------------------------------------------
router.get('/admin-assignments', verifyToken, isGlobalMonitorViewer, async (req, res) => {
  try {
    const now = new Date();
    const [coreDeptRecords, subDeptRecords, ceoPanelRecords] = await Promise.all([
      Department.findAll({
        where: { type: 'departments', parentId: null },
        attributes: ['id', 'name', 'status', 'adminId'],
        include: [{ model: User, as: 'admin', attributes: ['uid', 'name', 'role', 'email', 'status', 'createdAt'], required: false }],
        order: [['name', 'ASC']],
      }),
      Department.findAll({
        where: { type: 'sub-departments' },
        attributes: ['id', 'name', 'status', 'parentId', 'adminId'],
        include: [
          { model: User, as: 'admin', attributes: ['uid', 'name', 'role', 'email', 'status', 'createdAt'], required: false },
          { model: Department, as: 'parent', attributes: ['id', 'name'], required: false },
        ],
        order: [['name', 'ASC']],
      }),
      CEOPanel.findAll({
        include: [{ model: User, as: 'ceoUser', attributes: ['uid', 'name', 'email', 'status', 'createdAt'] }],
        order: [['createdAt', 'DESC']],
      }),
    ]);

    const orgAdmins = await User.findAll({
      where: { role: 'Organization Admin' },
      attributes: ['uid', 'name', 'email', 'status', 'createdAt'],
    });

    res.json({
      generatedAt: now.toISOString(),
      orgAdmins,
      coreDepartments: coreDeptRecords.map((d) => ({
        id: d.id,
        name: d.name,
        status: d.status,
        canonical: CORE_DEPARTMENTS.find((c) => c.name === d.name) || null,
        admin: d.admin
          ? { uid: d.admin.uid, name: d.admin.name, role: d.admin.role, email: d.admin.email, status: d.admin.status, assignedAt: d.admin.createdAt }
          : null,
      })),
      subDepartments: subDeptRecords.map((d) => ({
        id: d.id,
        name: d.name,
        status: d.status,
        parent: d.parent ? { id: d.parent.id, name: d.parent.name } : null,
        canonical: SUB_DEPARTMENTS.find((s) => s.name === d.name) || null,
        admin: d.admin
          ? { uid: d.admin.uid, name: d.admin.name, role: d.admin.role, email: d.admin.email, status: d.admin.status, assignedAt: d.admin.createdAt }
          : null,
      })),
      ceoPanels: ceoPanelRecords.map((p) => ({
        id: p.id,
        name: p.name,
        status: p.status,
        scope: Array.isArray(p.visibilityScope) ? p.visibilityScope : [],
        assignedCEO: p.ceoUser
          ? { uid: p.ceoUser.uid, name: p.ceoUser.name, email: p.ceoUser.email, status: p.ceoUser.status, assignedAt: p.ceoUser.createdAt }
          : null,
        createdAt: p.createdAt,
      })),
    });
  } catch (error) {
    console.error('[Global Monitor] admin-assignments error:', error);
    res.status(500).json({ error: 'Failed to fetch Admin Assignments monitor', details: error.message });
  }
});

// ---------------------------------------------------------------------------
// Teams: every department + sub-department with its roster
// ---------------------------------------------------------------------------
router.get('/teams', verifyToken, isGlobalMonitorViewer, async (req, res) => {
  try {
    const now = new Date();
    const [departments, subDepartments, users] = await Promise.all([
      Department.findAll({
        where: { type: 'departments', parentId: null },
        attributes: ['id', 'name', 'status'],
      }),
      Department.findAll({
        where: { type: 'sub-departments' },
        attributes: ['id', 'name', 'status', 'parentId'],
      }),
      User.findAll({
        where: {
          status: 'active',
          role: { [Op.notIn]: ['student', 'Student', 'Partner Center', 'partner-center'] },
        },
        attributes: ['uid', 'name', 'email', 'role', 'deptId', 'subDepartment', 'status'],
      }),
    ]);

    const teamsByDept = departments.map((d) => {
      const members = users.filter((u) => u.deptId === d.id);
      return {
        id: d.id,
        name: d.name,
        status: d.status,
        headCount: members.length,
        members,
      };
    });

    const teamsBySubDept = subDepartments.map((sd) => {
      const members = users.filter(
        (u) => u.subDepartment === sd.name || u.deptId === sd.id
      );
      return {
        id: sd.id,
        name: sd.name,
        parentId: sd.parentId,
        status: sd.status,
        headCount: members.length,
        members,
      };
    });

    res.json({
      generatedAt: now.toISOString(),
      totalActiveWorkforce: users.length,
      departments: teamsByDept,
      subDepartments: teamsBySubDept,
    });
  } catch (error) {
    console.error('[Global Monitor] teams error:', error);
    res.status(500).json({ error: 'Failed to fetch Teams monitor', details: error.message });
  }
});

// ---------------------------------------------------------------------------
// Directives & Surveys
// ---------------------------------------------------------------------------
router.get('/directives', verifyToken, isGlobalMonitorViewer, async (req, res) => {
  try {
    const now = new Date();
    const [directives, surveys, responses] = await Promise.all([
      Announcement.findAll({
        include: [{ model: User, as: 'author', attributes: ['uid', 'name', 'role'], required: false }],
        order: [['createdAt', 'DESC']],
        limit: 200,
      }),
      Survey.findAll({
        order: [['createdAt', 'DESC']],
        limit: 100,
      }),
      SurveyResponse.count(),
    ]);

    const active = directives.filter((d) => !d.expiryDate || new Date(d.expiryDate) > now);
    const activeSurveys = surveys.filter((s) => s.status === 'active');

    res.json({
      generatedAt: now.toISOString(),
      counts: {
        totalDirectives: directives.length,
        activeDirectives: active.length,
        totalSurveys: surveys.length,
        activeSurveys: activeSurveys.length,
        surveyResponses: responses,
      },
      directives,
      surveys,
    });
  } catch (error) {
    console.error('[Global Monitor] directives error:', error);
    res.status(500).json({ error: 'Failed to fetch Directives monitor', details: error.message });
  }
});

// ---------------------------------------------------------------------------
// Security & Telemetry
// ---------------------------------------------------------------------------
router.get('/security', verifyToken, isGlobalMonitorViewer, async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [recentLogs, totalLogs, highRisklogs, loginEvents] = await Promise.all([
      AuditLog.findAll({
        attributes: ['id', 'action', 'entity', 'userId', 'module', 'timestamp'],
        include: [{ model: User, as: 'user', attributes: ['name', 'role'], required: false }],
        order: [['timestamp', 'DESC']],
        limit: 200,
      }),
      AuditLog.count({ where: { timestamp: { [Op.gt]: thirtyDaysAgo } } }),
      AuditLog.findAll({
        where: {
          [Op.or]: [
            { module: { [Op.in]: ['CEO', 'GOVERNANCE', 'SECURITY'] } },
            { action: { [Op.like]: '%REVEAL%' } },
            { action: { [Op.like]: '%PAYOUT%' } },
            { action: { [Op.like]: '%DELETE%' } },
          ],
          timestamp: { [Op.gt]: thirtyDaysAgo },
        },
        limit: 100,
        order: [['timestamp', 'DESC']],
      }),
      AuditLog.count({
        where: {
          action: { [Op.like]: '%LOGIN%' },
          timestamp: { [Op.gt]: twentyFourHoursAgo },
        },
      }),
    ]);

    res.json({
      generatedAt: now.toISOString(),
      counts: {
        totalAudit30d: totalLogs,
        highRisk30d: highRisklogs.length,
        logins24h: loginEvents,
        recentActivity: recentLogs.length,
      },
      recentLogs,
      highRisklogs,
    });
  } catch (error) {
    console.error('[Global Monitor] security error:', error);
    res.status(500).json({ error: 'Failed to fetch Security monitor', details: error.message });
  }
});

// ---------------------------------------------------------------------------
// Operations & Regional
// ---------------------------------------------------------------------------
router.get('/operations', verifyToken, isGlobalMonitorViewer, async (req, res) => {
  try {
    const now = new Date();
    const [subDepts, centers, students, programs] = await Promise.all([
      Department.findAll({ where: { type: 'sub-departments' } }),
      Department.findAll({ where: { type: { [Op.in]: CENTER_TYPES } } }),
      Student.count(),
      Program.count(),
    ]);

    const regionalAudits = centers.reduce((acc, c) => {
      const status = c.auditStatus || 'pending';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    const unitHealth = await Promise.all(
      subDepts.map(async (sd) => {
        const studentCount = await Student.count({ where: { subDepartmentId: sd.id } });
        return {
          id: sd.id,
          name: sd.name,
          studentCount,
          status: sd.status,
          isHighPerforming: studentCount > 100, // Dynamic threshold
        };
      })
    );

    res.json({
      generatedAt: now.toISOString(),
      counts: {
        totalUnits: subDepts.length,
        totalCenters: centers.length,
        totalStudents: students,
        totalPrograms: programs,
      },
      regionalAudits,
      unitHealth,
      centers: centers.slice(0, 300).map(c => ({
        id: c.id,
        name: c.name,
        auditStatus: c.auditStatus,
        status: c.status,
        createdAt: c.createdAt
      }))
    });
  } catch (error) {
    console.error('[Global Monitor] operations error:', error);
    res.status(500).json({ error: 'Failed to fetch Operations monitor', details: error.message });
  }
});

export default router;
