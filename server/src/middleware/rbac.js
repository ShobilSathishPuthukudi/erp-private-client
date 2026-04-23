import { models } from '../models/index.js';
import { Op } from 'sequelize';
import { normalizeInstitutionRoleName } from '../config/institutionalStructure.js';

const { OrgConfig, RolePermissionShadow } = models;

// Process-level cache for performance
let cachedMatrix = null;
let lastFetchTime = 0;
const CACHE_TTL = 30000; // 30 seconds

/**
 * Fetch and cache the GLOBAL_PERMISSION_MATRIX
 */
const getMatrix = async () => {
  const now = Date.now();
  if (cachedMatrix && (now - lastFetchTime < CACHE_TTL)) {
    return cachedMatrix;
  }

  const config = await OrgConfig.findOne({ where: { key: 'GLOBAL_PERMISSION_MATRIX' } });
  if (config) {
    cachedMatrix = config.value.matrix;
    lastFetchTime = now;
    return cachedMatrix;
  }
  return {};
};

/**
 * clearMatrixCache
 * Call this when matrix is updated to force a refresh on next request.
 */
export const clearMatrixCache = () => {
  cachedMatrix = null;
  lastFetchTime = 0;
};

/**
 * checkPermission
 * Core RBAC middleware for institutional trigger enforcement.
 * 
 * @param {string} actionId - The unique identifier for the ERP flow action.
 * @param {string} requiredFlag - read | create | update | delete | approve
 */
export const checkPermission = (actionId, requiredFlag) => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      if (!user || !user.role) {
        return res.status(401).json({ error: 'Unauthenticated or role missing' });
      }

      // CEO and Org Admin bypass with institutional normalization
      const canonicalRole = normalizeInstitutionRoleName(user.role);
      const normalizedRole = canonicalRole.toLowerCase();
      const upperRoles = ['ceo', 'organization admin'];
      
      if (upperRoles.includes(normalizedRole)) {
        req.permissionFilter = {}; // Global access
        return next();
      }

      const matrix = await getMatrix();
      const rolePerms = matrix[canonicalRole];

      if (!rolePerms || !rolePerms[actionId]) {
        return res.status(403).json({ 
          error: `Institutional access denied: Action [${actionId}] not defined for role [${user.role}]`,
          code: 'PERM_UNDEFINED'
        });
      }

      const actionPerms = rolePerms[actionId];

      if (!actionPerms[requiredFlag]) {
        return res.status(403).json({ 
          error: `Insufficient privileges: [${requiredFlag}] flag disabled for [${actionId}]`,
          code: 'PERM_DENIED'
        });
      }

      // 1. Build Permission Filter (Scope Resolution)
      const scope = actionPerms.scope || 'SELF';
      let filter = {};

      switch (scope) {
        case 'GLOBAL':
          filter = {};
          break;
        case 'DEPARTMENT':
          filter = { [Op.or]: [{ deptId: user.deptId || 0 }, { departmentId: user.deptId || 0 }] };
          break;
        case 'CENTER':
          filter = { centerId: user.centerId || user.deptId || 0 }; 
          break;
        case 'SELF':
          filter = { [Op.or]: [{ employeeId: user.uid }, { uid: user.uid }, { userId: user.uid }, { createdBy: user.uid }, { bdeId: user.uid }] };
          break;
        default:
          filter = { uid: 'NONE' }; // Deny by default on invalid scope
      }

      // 2. Ownership Override
      if (actionPerms.ownership && scope !== 'GLOBAL') {
        // Ownership force-restricts to SELF regardless of higher scope
        filter = { [Op.or]: [{ employeeId: user.uid }, { uid: user.uid }, { userId: user.uid }, { createdBy: user.uid }] };
      }

      req.permissionFilter = filter;
      req.actionPermissions = actionPerms;
      
      next();
    } catch (error) {
      console.error('[RBAC_ENFORCEMENT_ERROR]:', error);
      res.status(500).json({ error: 'Internal RBAC reconciliation failure' });
    }
  };
};

/**
 * checkPermissionOrRole
 * Uses RBAC matrix when configured, but falls back to legacy role access
 * when the action is not yet mapped in the permission matrix.
 *
 * This preserves explicit matrix denies while preventing legacy pages from
 * breaking during partial RBAC rollout.
 */
export const checkPermissionOrRole = (actionId, requiredFlag, fallbackRoles = []) => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      if (!user || !user.role) {
        return res.status(401).json({ error: 'Unauthenticated or role missing' });
      }

      const canonicalRole = normalizeInstitutionRoleName(user.role);
      const normalizedRole = canonicalRole.toLowerCase();
      const upperRoles = ['ceo', 'organization admin'];

      if (upperRoles.includes(normalizedRole)) {
        req.permissionFilter = {};
        return next();
      }

      const matrix = await getMatrix();
      const rolePerms = matrix[canonicalRole];
      const actionPerms = rolePerms?.[actionId];

      if (!actionPerms) {
        const normalizedFallbackRoles = fallbackRoles
          .map((role) => normalizeInstitutionRoleName(role).toLowerCase());

        if (normalizedFallbackRoles.includes(normalizedRole)) {
          req.permissionFilter = {};
          req.actionPermissions = null;
          return next();
        }

        return res.status(403).json({
          error: `Institutional access denied: Action [${actionId}] not defined for role [${user.role}]`,
          code: 'PERM_UNDEFINED'
        });
      }

      if (!actionPerms[requiredFlag]) {
        return res.status(403).json({
          error: `Insufficient privileges: [${requiredFlag}] flag disabled for [${actionId}]`,
          code: 'PERM_DENIED'
        });
      }

      const scope = actionPerms.scope || 'SELF';
      let filter = {};

      switch (scope) {
        case 'GLOBAL':
          filter = {};
          break;
        case 'DEPARTMENT':
          filter = { [Op.or]: [{ deptId: user.deptId || 0 }, { departmentId: user.deptId || 0 }] };
          break;
        case 'CENTER':
          filter = { centerId: user.centerId || user.deptId || 0 };
          break;
        case 'SELF':
          filter = { [Op.or]: [{ employeeId: user.uid }, { uid: user.uid }, { userId: user.uid }, { createdBy: user.uid }, { bdeId: user.uid }] };
          break;
        default:
          filter = { uid: 'NONE' };
      }

      if (actionPerms.ownership && scope !== 'GLOBAL') {
        filter = { [Op.or]: [{ employeeId: user.uid }, { uid: user.uid }, { userId: user.uid }, { createdBy: user.uid }] };
      }

      req.permissionFilter = filter;
      req.actionPermissions = actionPerms;

      next();
    } catch (error) {
      console.error('[RBAC_FALLBACK_ENFORCEMENT_ERROR]:', error);
      res.status(500).json({ error: 'Internal RBAC reconciliation failure' });
    }
  };
};

/**
 * enforceApprovalChain
 * Validates institutional sequences and prevents self-approval.
 */
export const enforceApprovalChain = (options = {}) => {
  const { 
    currentStatusField = 'status',
    validInitialStatuses = [],
    initiatorField = 'employeeId'
  } = options;

  return (req, res, next) => {
    const resource = req.resource; // Expecting resource to be attached by a previous middleware (loadResource)
    if (!resource) {
      // If resource not pre-loaded, we skip sequence check but warn
      console.warn('[RBAC] enforceApprovalChain called without pre-loaded resource.');
      return next();
    }

    const currentStatus = resource[currentStatusField];
    const initiatorId = resource[initiatorField];

    // 1. Sequence Validation
    if (validInitialStatuses.length > 0 && !validInitialStatuses.includes(currentStatus)) {
      return res.status(400).json({ 
        error: `Institutional sequence violation: Action invalid for current status [${currentStatus}]`,
        required: validInitialStatuses
      });
    }

    // 2. Anti-Self-Approval
    if (initiatorId === req.user.uid) {
      return res.status(403).json({ 
        error: 'Governance violation: Institutional actors cannot approve their own requests.',
        code: 'SELF_APPROVAL_DENIED'
      });
    }

    next();
  };
};
