import express from 'express';
import { models, sequelize } from '../models/index.js';
import { Op } from 'sequelize';
import { verifyToken } from '../middleware/verifyToken.js';
import { augmentTaskCollection } from '../utils/taskAugmentation.js';

const router = express.Router();
const { Student, Department, Program, Payment, Lead, User, Vacancy, Leave, Task, AdmissionSession, Invoice, CenterProgram } = models;

const CENTER_TYPES = ['partner-center', 'partner center', 'partner centers', 'study-center', 'Study centers', 'study centers'];
const SUB_DEPT_ROLES = ['open school admin', 'online admin', 'online department admin', 'bvoc admin', 'bvoc department admin', 'skill admin', 'skill department admin'];
const EXECUTIVE_ROLES = ['ceo', 'organization admin', 'finance admin', 'academic operations admin'];

const getLegacySubDeptId = (normalizedRole = '') => {
  if (normalizedRole.includes('open school')) return 8;
  if (normalizedRole.includes('online')) return 9;
  if (normalizedRole.includes('skill')) return 10;
  if (normalizedRole.includes('bvoc')) return 11;
  return null;
};

const getSubDeptScopeIds = (normalizedRole, deptId) => {
  if (!SUB_DEPT_ROLES.includes(normalizedRole)) return [];

  const ids = [Number(deptId), getLegacySubDeptId(normalizedRole)]
    .filter((value) => Number.isInteger(value) && value > 0);

  return [...new Set(ids)];
};

const getStudentScope = (normalizedRole, deptId) => {
  if (normalizedRole === 'partner center') return { centerId: deptId };
  if (SUB_DEPT_ROLES.includes(normalizedRole)) {
    const scopeIds = getSubDeptScopeIds(normalizedRole, deptId);
    return scopeIds.length > 0 ? { subDepartmentId: { [Op.in]: scopeIds } } : {};
  }
  return {};
};

/**
 * Institutional Dashboard Drill-Down API
 * Provides granular data for specific metric counts with RBAC enforcement.
 */
router.get('/drill-down/:type', verifyToken, async (req, res) => {
  try {
    const { type } = req.params;
    const { role, uid, deptId } = req.user;
    const normalizedRole = role?.toLowerCase().trim();

    let details = [];
    const studentScope = getStudentScope(normalizedRole, deptId);
    const isExecutive = EXECUTIVE_ROLES.includes(normalizedRole);
    const mappedCenterIds = (normalizedRole === 'partner center' && deptId) ? [deptId] : [];
    const mappedSubDeptIds = getSubDeptScopeIds(normalizedRole, deptId);

    switch (type) {
      case 'students':
      case 'totalStudents':
      case 'pendingAdmissions':
      case 'finance_pending_approvals':
        {
          let statusFilter = {};
          if (type === 'pendingAdmissions') {
            statusFilter = {
              [Op.or]: [
                { status: { [Op.notIn]: ['ENROLLED', 'REJECTED', 'DRAFT'] } },
                { enrollStatus: { [Op.in]: ['pending', 'pending_ops', 'pending_subdept', 'pending_finance'] } }
              ]
            };
          } else if (type === 'finance_pending_approvals') {
            statusFilter = {
              [Op.or]: [
                { status: { [Op.in]: ['FINANCE_PENDING', 'PAYMENT_VERIFIED'] } },
                { enrollStatus: 'pending_finance' }
              ]
            };
          }

          details = await Student.findAll({
            where: { ...studentScope, ...statusFilter },
            include: [
              { model: Department, as: 'center', attributes: ['name'] },
              { model: Program, attributes: ['name', 'shortName'] }
            ],
            limit: 500,
            order: [['createdAt', 'DESC']]
          });
        }
        break;

      case 'centers':
      case 'activeCenters':
        {
          const centerQuery = { 
            type: { [Op.in]: CENTER_TYPES },
            status: 'active'
          };

          if (mappedCenterIds.length > 0) {
            centerQuery.id = { [Op.in]: mappedCenterIds };
          } else if (mappedSubDeptIds.length > 0) {
            centerQuery.id = {
              [Op.in]: sequelize.literal(`(SELECT DISTINCT centerId FROM center_programs WHERE subDeptId IN (${mappedSubDeptIds.join(',')}) AND isActive = true)`)
            };
          }

          details = await Department.findAll({
            where: centerQuery,
            include: [{ model: User, as: 'admin', attributes: ['name', 'email'] }],
            limit: 200
          });
        }
        break;

      case 'universities':
        {
          let universityIds = [];

          if (mappedCenterIds.length > 0) {
            const centerPrograms = await CenterProgram.findAll({
              where: { centerId: { [Op.in]: mappedCenterIds }, isActive: true },
              attributes: ['programId'],
              raw: true
            });
            const programIds = [...new Set(centerPrograms.map((record) => record.programId).filter(Boolean))];
            const scopedPrograms = await Program.findAll({
              where: { id: { [Op.in]: programIds } },
              attributes: ['universityId'],
              raw: true
            });
            universityIds = [...new Set(scopedPrograms.map((program) => program.universityId).filter(Boolean))];
          } else {
            const scopedPrograms = await Program.findAll({
              where: mappedSubDeptIds.length > 0 ? { subDeptId: { [Op.in]: mappedSubDeptIds } } : {},
              attributes: ['universityId'],
              raw: true
            });
            universityIds = [...new Set(scopedPrograms.map((program) => program.universityId).filter(Boolean))];
          }

          details = await Department.findAll({
            where: { id: { [Op.in]: universityIds } },
            include: [{ model: User, as: 'admin', attributes: ['name', 'email'] }],
            limit: 100
          });
        }
        break;

      case 'programs':
      case 'activePrograms':
        {
          const where = {};
          if (mappedCenterIds.length > 0) {
            const centerPrograms = await CenterProgram.findAll({
              where: { centerId: { [Op.in]: mappedCenterIds }, isActive: true },
              attributes: ['programId'],
              raw: true
            });
            where.id = { [Op.in]: [...new Set(centerPrograms.map((record) => record.programId).filter(Boolean))] };
          } else if (mappedSubDeptIds.length > 0) {
            where.subDeptId = { [Op.in]: mappedSubDeptIds };
          } else if (!isExecutive && normalizedRole.includes('department') && deptId) {
            where.universityId = deptId;
          }

          if (type === 'activePrograms') {
            where.status = { [Op.in]: ['active', 'staged'] };
          }

          details = await Program.findAll({
            where,
            include: [{ model: Department, as: 'university', attributes: ['name'] }],
            limit: 200
          });
        }
        break;

      case 'batches':
      case 'activeBatches':
        {
          const where = {};
          if (mappedCenterIds.length > 0) where.centerId = { [Op.in]: mappedCenterIds };
          if (mappedSubDeptIds.length > 0) where.subDeptId = { [Op.in]: mappedSubDeptIds };

          details = await AdmissionSession.findAll({
            where,
            include: [
              { model: Program, attributes: ['name', 'shortName'] },
              { model: Department, as: 'center', attributes: ['name'] }
            ],
            limit: 300,
            order: [['createdAt', 'DESC']]
          });
        }
        break;

      case 'revenue':
      case 'yield_revenue':
      case 'pendingFees':
      case 'dormant_invoices':
        {
          if (type === 'pendingFees' || type === 'dormant_invoices') {
            const invoiceWhere = {
              status: 'issued'
            };
            if (type === 'dormant_invoices') {
              invoiceWhere.createdAt = {
                [Op.lt]: new Date(Date.now() - (90 * 24 * 60 * 60 * 1000))
              };
            }

            details = await Invoice.findAll({
              where: invoiceWhere,
              include: [
                {
                  model: Student,
                  as: 'student',
                  required: false,
                  where: Object.keys(studentScope).length > 0 ? studentScope : undefined,
                  attributes: ['name', 'uid'],
                  include: [{ model: Department, as: 'center', attributes: ['name'] }]
                }
              ],
              limit: 300,
              order: [['createdAt', 'DESC']]
            });
          } else {
            details = await Payment.findAll({
              where: { status: 'verified' },
              include: [
                { 
                  model: Student, 
                  as: 'student', 
                  where: studentScope,
                  attributes: ['name', 'uid'],
                  include: [{ model: Department, as: 'center', attributes: ['name'] }]
                }
              ],
              limit: 300,
              order: [['createdAt', 'DESC']]
            });
          }
        }
        break;

      case 'leads':
      case 'crm_leads':
        {
          // Sales admins see all leads. Employees see assigned leads.
          const leadScope = ['sales & crm admin', 'ceo'].includes(normalizedRole) ? {} : { assignedTo: uid };
          details = await Lead.findAll({
            where: leadScope,
            include: [{ model: User, as: 'assignee', attributes: ['name'] }],
            limit: 300,
            order: [['createdAt', 'DESC']]
          });
        }
        break;

      case 'hr_staff':
        {
          details = await User.findAll({
            attributes: ['uid', 'name', 'email', 'role', 'status'],
            where: { 
              status: 'active',
              [Op.and]: [
                { role: { [Op.ne]: 'student' } },
                { role: { [Op.notLike]: '%admin%' } },
                { role: { [Op.notLike]: '%ceo%' } }
              ]
            },
            limit: 500
          });
        }
        break;

      case 'hr_vacancies':
        {
          details = await Vacancy.findAll({
            where: { status: 'open' },
            include: [{ model: Department, as: 'department', attributes: ['name'] }]
          });
        }
        break;

      case 'hr_leaves':
        {
          details = await Leave.findAll({
            where: { status: { [Op.in]: ['pending admin', 'pending hr'] } },
            include: [{ model: User, as: 'employee', attributes: ['name'] }]
          });
        }
        break;

      case 'tasks':
        {
          const tasksRaw = await Task.findAll({
            where: { 
              status: { [Op.ne]: 'completed' },
              deadline: { [Op.lt]: new Date() }
            },
            include: [{ model: User, as: 'assignee', attributes: ['name'], required: false }],
            limit: 200
          });
          details = augmentTaskCollection(tasksRaw);
        }
        break;
      
      case 'risk_alerts':
      case 'riskExposureNodes':
        {
          const riskData = await Student.findAll({
            where: { 
                ...studentScope,
                status: { [Op.in]: ['FINANCE_PENDING', 'PAYMENT_VERIFIED'] } 
            },
            include: [
              { model: Department, as: 'center', attributes: ['name'] },
              { model: Program, attributes: ['name', 'shortName'] },
              { 
                model: Invoice, 
                as: 'invoice', 
                where: { status: 'paid' }, 
                required: false 
              }
            ],
            limit: 500,
            order: [['createdAt', 'DESC']]
          });

          // Filter for students who EITHER don't have an invoice OR have one that isn't paid.
          // Since the include above only fetches PAID invoices, any student without a linked
          // 'invoice' object here is a risk exposure node.
          details = riskData.filter(student => !student.invoice);
        }
        break;

      default:
        return res.status(400).json({ error: 'Invalid drill-down type protocol' });
    }

    res.json({
      type,
      count: details.length,
      details
    });

  } catch (error) {
    console.error(`[DRILL_DOWN_ERROR] Phase ${req.params.type}:`, error);
    res.status(500).json({ error: 'Failed to fetch forensic details', message: error.message });
  }
});

export default router;
