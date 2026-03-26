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
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient privileges' });
    }
    next();
  };
};

export const isAcademicOrAdmin = roleGuard(['academic', 'org-admin', 'system-admin']);
export const isOpsOrAdmin = roleGuard(['academic', 'org-admin', 'system-admin', 'SUB_DEPT_ADMIN']);
export const isSubDeptAdmin = roleGuard(['SUB_DEPT_ADMIN']);
export const isSystemAdmin = roleGuard(['system-admin', 'org-admin']);
