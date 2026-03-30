import { Op } from 'sequelize';
import { models } from '../models/index.js';

const { CEOPanel, Department } = models;

/**
 * Middleware: applyExecutiveScope
 * Attaches a Sequelize 'where' clause to the request based on the CEO's visibility scope.
 * Usage: router.get('/...', applyExecutiveScope, async (req, res) => { ... })
 */
export const applyExecutiveScope = async (req, res, next) => {
  try {
    const { role, uid } = req.user;

    // Unrestricted roles
    if (role === 'org-admin' || role === 'system-admin') {
      req.visibility = { restricted: false, filter: {} };
      return next();
    }

    if (role !== 'ceo') {
      req.visibility = { restricted: false, filter: {} };
      return next();
    }

    // CEO Role: Fetch panel configuration
    const panel = await CEOPanel.findOne({ where: { userId: uid, status: 'Active' } });
    
    if (!panel || !panel.visibilityScope || !Array.isArray(panel.visibilityScope) || panel.visibilityScope.length === 0) {
      // If no scope is defined, CEO sees NOTHING (Security by default)
      req.visibility = { 
        restricted: true, 
        deptIds: [], 
        names: [],
        filter: { id: -1 } // Impossible query
      };
      return next();
    }

    // Map scope names to IDs
    const depts = await Department.findAll({
      where: { name: { [Op.in]: panel.visibilityScope } },
      attributes: ['id', 'name']
    });

    const deptIds = depts.map(d => d.id);
    const names = depts.map(d => d.name);

    req.visibility = {
      restricted: true,
      deptIds,
      names,
      filter: {
        [Op.or]: [
          { id: { [Op.in]: deptIds } },               // For Department model itself
          { deptId: { [Op.in]: deptIds } },           // For User, Student, Task, etc.
          { departmentId: { [Op.in]: deptIds } },   // For Vacancy
          { subDepartmentId: { [Op.in]: deptIds } }, // For Student sub-dept links
          { subDepartment: { [Op.in]: names } }      // For User textual links
        ]
      }
    };

    next();
  } catch (error) {
    console.error('Visibility Middleware Error:', error);
    res.status(500).json({ error: 'Internal security guard failure' });
  }
};
