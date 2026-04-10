import express from 'express';
import { models, sequelize } from '../models/index.js';
import { Op } from 'sequelize';
import { verifyToken } from '../middleware/verifyToken.js';

const router = express.Router();
const { Student, Department, Program, Payment, Lead, User, Vacancy, Leave, Task, AdmissionSession } = models;

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
    let queryScope = {};

    // Apply Jurisdictional Scoping
    // CEO/Org Admin see everything. Dept Admins see their unit. Centers see their students.
    if (['ceo', 'organization admin', 'finance admin', 'academic operations admin'].includes(normalizedRole)) {
      queryScope = {}; // Global visibility
    } else if (normalizedRole === 'partner center') {
      queryScope = { centerId: deptId }; // Restricted to their center
    } else if (['open school admin', 'online department admin', 'bvoc department admin', 'skill department admin'].includes(normalizedRole)) {
      queryScope = { subDepartmentId: deptId }; // Restricted to their sub-dept
    }

    switch (type) {
      case 'students':
      case 'totalStudents':
      case 'pendingAdmissions':
        {
          const statusFilter = type === 'pendingAdmissions' 
            ? { status: { [Op.notIn]: ['ENROLLED', 'REJECTED'] } }
            : {};

          details = await Student.findAll({
            where: { ...queryScope, ...statusFilter },
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
          // For global admins: show all centers. For sub-dept admins: show centers with their programs.
          const centerQuery = { 
            type: { [Op.in]: ['partner centers', 'partner-center'] },
            status: 'active'
          };

          details = await Department.findAll({
            where: centerQuery,
            include: [{ model: User, as: 'admin', attributes: ['name', 'email'] }],
            limit: 200
          });
        }
        break;

      case 'programs':
      case 'activePrograms':
        {
          details = await Program.findAll({
            where: normalizedRole.includes('department') ? { universityId: deptId } : {},
            include: [{ model: Department, as: 'university', attributes: ['name'] }],
            limit: 200
          });
        }
        break;

      case 'batches':
      case 'activeBatches':
        {
          details = await AdmissionSession.findAll({
            where: queryScope,
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
        {
          const paymentStatus = type === 'pendingFees' ? 'pending' : 'verified';
          details = await Payment.findAll({
            where: { status: paymentStatus },
            include: [
              { 
                model: Student, 
                as: 'student', 
                where: queryScope,
                attributes: ['name', 'uid'],
                include: [{ model: Department, as: 'center', attributes: ['name'] }]
              }
            ],
            limit: 300,
            order: [['createdAt', 'DESC']]
          });
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
            where: { status: 'active' },
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
            where: { status: 'pending' },
            include: [{ model: User, as: 'employee', attributes: ['name'] }]
          });
        }
        break;

      case 'tasks':
        {
          details = await Task.findAll({
            where: { status: { [Op.not]: 'completed' } },
            include: [{ model: User, as: 'assignee', attributes: ['name'] }],
            limit: 200
          });
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
