
/**
 * Institutional RBAC Configuration
 * Centralized source of truth for role classification, user types, and governance rules.
 */

import { normalizeInstitutionRoleName } from './institutionalStructure.js';

export const ENTITY_TYPES = {
  ROLE: 'ROLE',
  USER_TYPE: 'USER_TYPE',
  DEPARTMENT: 'DEPARTMENT'
};

// TRUE ROLES (RBAC permission entities)
export const TRUE_ROLES = [
  'CEO',
  'Organization Admin',
  'HR Admin',
  'Finance Admin',
  'Academic Operations Admin',
  'Sales Admin',
  'BVoc Admin',
  'Skill Admin',
  'Open School Admin',
  'Online Admin',
  'Operations Admin'
];

// USER TYPES (Instances of users, NOT roles)
export const USER_TYPES = [
  'Employee',
  'Student',
  'Partner Center',
  'Center'
];

// SINGLETON ROLES (Enforced 1 active user)
export const SINGLETON_ROLES = [
  'Organization Admin',
  'Organization Administrator',
  'HR Admin',
  'Finance Admin',
  'Academic Operations Admin',
  'Sales Admin',
  'BVoc Admin',
  'Skill Admin',
  'Open School Admin',
  'Online Admin'
];

// DEPARTMENT HIERARCHY
export const ACADEMIC_HIERARCHY = {
  PARENT: 'Academic Operations',
  CHILDREN: ['BVoc', 'Skill', 'Open School', 'Online']
};

/**
 * Helper to classify an entity name
 */
export const classifyEntity = (name) => {
  const n = normalizeInstitutionRoleName(name)?.toLowerCase()?.trim();
  
  if (TRUE_ROLES.some(r => r.toLowerCase() === n)) return ENTITY_TYPES.ROLE;
  if (USER_TYPES.some(u => u.toLowerCase() === n)) return ENTITY_TYPES.USER_TYPE;
  if (ACADEMIC_HIERARCHY.CHILDREN.some(c => c.toLowerCase() === n)) return ENTITY_TYPES.DEPARTMENT;
  
  return ENTITY_TYPES.ROLE; // Default to Role for custom entries
};
