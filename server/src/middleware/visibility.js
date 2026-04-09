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

    const normalizedRole = role?.toLowerCase()?.trim();
    const adminRoles = ['organization admin', 'academic operations admin', 'operations admin'];

    if (adminRoles.includes(normalizedRole)) {
      req.visibility = { restricted: false, filter: {} };
      return next();
    }

    if (normalizedRole !== 'ceo') {
      req.visibility = { restricted: false, filter: {} };
      return next();
    }

    // Resolve models at runtime to avoid circular dependency issues (CEOPanel might be undefined at module boot)
    const { CEOPanel, Department } = models;
    const panel = await CEOPanel.findOne({ where: { userId: uid, status: 'Active' } });
    
    if (!panel || !panel.visibilityScope || !Array.isArray(panel.visibilityScope) || panel.visibilityScope.length === 0) {
      // If no scope is defined, CEO sees NOTHING (Security by default)
      req.visibility = { 
        restricted: true, 
        deptIds: [], 
        names: [],
        filter: { uid: 'impossible-registry-key' } // Impossible query
      };
      return next();
    }

    // Map scope names to IDs with FUZZY matching for robustness
    const scopeStrings = Array.isArray(panel.visibilityScope) 
      ? panel.visibilityScope 
      : (typeof panel.visibilityScope === 'string' ? JSON.parse(panel.visibilityScope) : []);

    const allDepts = await Department.findAll({ attributes: ['id', 'name', 'parentId'] });
    
    // 1. Resolve Primary Scope (Mapped Tokenization for new UX suites & Legacy primitives)
    const primaryDepts = allDepts.filter(d => {
      const dName = d.name.toLowerCase();
      return scopeStrings.some(s => {
        const sLower = s.toLowerCase();
        
        // Map the new UX suites down to raw primitive structural tokens
        if (sLower.includes('academic') || sLower.includes('enrollment')) {
          return dName.includes('academic');
        }
        if (sLower.includes('finance') || sLower.includes('account')) {
          return dName.includes('finance');
        }
        if (sLower.includes('operation') || sLower.includes('regional')) {
          return dName.includes('operation');
        }
        if (sLower.includes('hr') || sLower.includes('human resource') || sLower.includes('marketing')) {
          return dName.includes('hr') || dName.includes('marketing') || dName.includes('human resource');
        }
        if (sLower.includes('sales')) {
          return dName.includes('sales');
        }
        if (sLower.includes('security')) {
          return dName.includes('security');
        }

        // Fallback for primitive unmapped legacy tokens (e.g. "Administration")
        const sClean = sLower.replace(/ department| admin| portal/g, '').trim();
        return dName.includes(sClean);
      });
    });

    const primaryIds = primaryDepts.map(d => d.id);
    
    // 2. Expand Scope (Hierarchy)
    const findChildrenRecursively = (parentId) => {
      const children = allDepts.filter(d => d.parentId === parentId);
      let ids = children.map(c => c.id);
      children.forEach(c => {
        ids = [...ids, ...findChildrenRecursively(c.id)];
      });
      return ids;
    };

    let scopedIds = [...primaryIds];
    primaryIds.forEach(id => {
      scopedIds = [...scopedIds, ...findChildrenRecursively(id)];
    });

    const deptIds = [...new Set(scopedIds)];
    const names = allDepts.filter(d => deptIds.includes(d.id)).map(d => d.name);
    
    console.log(`[VISIBILITY-SEC] User: ${uid} | Resolved Scope: ${names.length} entities | IDs: ${deptIds}`);

    const isGlobal = scopeStrings.includes('all') || scopeStrings.some(s => {
      const clean = s.toLowerCase().replace(/ scope$/i, '').trim();
      return clean === 'global overseer' || clean === 'global(all)';
    });

    req.visibility = {
      restricted: !isGlobal,
      deptIds,
      names: [...new Set([...names, ...scopeStrings])],
      filter: isGlobal ? {} : {
        [Op.or]: [
          { deptId: { [Op.in]: deptIds } },           // For User, Student, Task, etc.
          { departmentId: { [Op.in]: deptIds } },     // For Vacancy
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
