import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { context } from '../lib/context.js';
import { normalizeInstitutionRoleName } from '../config/institutionalStructure.js';

dotenv.config();

export const verifyToken = (req, res, next) => {
  const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    console.log('VerifyToken: Token is missing. Cookies:', req.cookies, 'Headers:', req.headers.authorization);
    return res.status(401).json({ error: 'Access denied, token missing!' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    
    // Run all subsequent operations within the user context for auditing (GAP-5)
    context.run({ 
      userId: payload.uid, 
      userRole: payload.role,
      subDepartment: payload.subDepartment 
    }, () => {
      next();
    });
  } catch (error) {
    console.log('VerifyToken: Error verifying token:', error.message);
    res.status(401).json({ error: 'Token is invalid or expired' });
  }
};

export const roleGuard = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({ error: 'Forbidden: Role missing' });
    }
    const userRole = normalizeInstitutionRoleName(req.user.role).toLowerCase();
    const normalizedAllowed = allowedRoles.map(r => normalizeInstitutionRoleName(r).toLowerCase());
    
    // Alias normalization: Standardized on 'partner centers'
    let effectorRole = userRole;
    if (['center', 'centers', 'study-center', 'study-centers', 'partner-center', 'partner center', 'partner centers'].includes(userRole)) {
      effectorRole = 'partner centers';
    }

    if (!normalizedAllowed.includes(effectorRole) && !normalizedAllowed.includes(userRole)) {
      return res.status(403).json({ error: `Forbidden: Insufficient privileges for role: ${userRole}` });
    }
    next();
  };
};

// Standardized Guards for Institutional Control
export const isAcademicOrAdmin = (req, res, next) => {
  const UNIT_ROLES = [
    'Open School Admin', 
    'Online Admin', 
    'Skill Admin', 
    'BVoc Admin', 
    'Academic Admin', 
    'Organization Admin', 
    'Finance Admin', 
    'Operations Admin', 
    'Operations Administrator',
    'Academic Operations Admin',
    'Academic Operations Administrator',
    'Academic Operations',
    'Sales Admin',
    'SUB_DEPT_ADMIN',
    'Partner Center',
    'partner centers'
  ];
  const userRole = normalizeInstitutionRoleName(req.user.role || '');
  const deptName = req.user.departmentName || '';

  const normalizedRoles = UNIT_ROLES.map(r => r.toLowerCase());
  const roleMatch = normalizedRoles.includes(userRole.toLowerCase());
  const isSalesStaff = deptName.toLowerCase().includes('sales & crm admin') || deptName.toLowerCase().includes('sales department');

  if (roleMatch || (userRole.toLowerCase() === 'employee' && isSalesStaff)) {
    return next();
  }
  return res.status(403).json({ error: `Forbidden: Institutional access denied for: ${userRole}` });
};

export const isOpsOrAdmin = (req, res, next) => {
  const UNIT_ROLES = [
    'Open School Admin', 
    'Online Admin', 
    'Skill Admin', 
    'BVoc Admin', 
    'Operations Admin', 
    'Operations Administrator',
    'Academic Operations Admin',
    'Academic Operations Administrator',
    'Academic Operations',
    'Organization Admin', 
    'Sales Admin',
    'SUB_DEPT_ADMIN',
    'Partner Center',
    'partner centers'
  ];
  const userRole = normalizeInstitutionRoleName(req.user.role || '');
  const deptName = req.user.departmentName || '';

  const normalizedRoles = UNIT_ROLES.map(r => r.toLowerCase());
  const roleMatch = normalizedRoles.includes(userRole.toLowerCase());
  const isSalesStaff = deptName.toLowerCase().includes('sales & crm admin') || deptName.toLowerCase().includes('sales department');

  if (roleMatch || (userRole.toLowerCase() === 'employee' && isSalesStaff)) {
    return next();
  }
  return res.status(403).json({ error: `Forbidden: Operations access denied for: ${userRole}` });
};

export const isSubDeptAdmin = roleGuard(['BVoc Admin', 'Skill Admin', 'Open School Admin', 'Online Admin']);
export const isSystemAdmin = roleGuard(['Organization Admin']);
export const isArchitectureAdmin = roleGuard(['Operations Admin', 'Operations Administrator', 'Academic Operations Admin', 'Academic Operations Administrator', 'Academic Operations', 'Organization Admin']);
export const isCEO = roleGuard(['ceo']);
