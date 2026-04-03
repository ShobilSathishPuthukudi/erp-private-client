import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { context } from '../lib/context.js';

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
    const userRole = req.user.role.toLowerCase();
    const normalizedAllowed = allowedRoles.map(r => r.toLowerCase());
    
    // Alias normalization
    let effectorRole = userRole;
    if (userRole === 'center') effectorRole = 'study-center';

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
    'Online Department Admin', 
    'Skill Department Admin', 
    'BVoc Department Admin', 
    'Academic Admin', 
    'Organization Admin', 
    'Finance Admin', 
    'Operations Admin', 
    'Sales & CRM Admin'
  ];
  const userRole = req.user.role || '';
  const deptName = req.user.departmentName || '';

  const normalizedRoles = UNIT_ROLES.map(r => r.toLowerCase());
  const roleMatch = normalizedRoles.includes(userRole.toLowerCase());

  if (roleMatch || (userRole.toLowerCase() === 'employee' && deptName.toLowerCase().includes('sales & crm admin'))) {
    return next();
  }
  return res.status(403).json({ error: `Forbidden: Institutional access denied for: ${userRole}` });
};

export const isOpsOrAdmin = (req, res, next) => {
  const UNIT_ROLES = [
    'Open School Admin', 
    'Online Department Admin', 
    'Skill Department Admin', 
    'BVoc Department Admin', 
    'Operations Admin', 
    'Organization Admin', 
    'Sales & CRM Admin'
  ];
  const userRole = req.user.role || '';
  const deptName = req.user.departmentName || '';

  const normalizedRoles = UNIT_ROLES.map(r => r.toLowerCase());
  const roleMatch = normalizedRoles.includes(userRole.toLowerCase());

  if (roleMatch || (userRole.toLowerCase() === 'employee' && deptName.toLowerCase().includes('sales & crm admin'))) {
    return next();
  }
  return res.status(403).json({ error: `Forbidden: Operations access denied for: ${userRole}` });
};

export const isSubDeptAdmin = roleGuard(['BVoc Department Admin', 'Skill Department Admin', 'Open School Admin', 'Online Department Admin']);
export const isSystemAdmin = roleGuard(['Organization Admin']);
export const isArchitectureAdmin = roleGuard(['Operations Admin', 'Organization Admin']);
