import { normalizeInstitutionRoleName } from '../../config/institutionalStructure.js';

/**
 * Senior Backend Architecture: Strict RBAC Task Validation
 * Ensures hierarchical task flow and departmental isolation.
 * 
 * @param {Object} assigner - The user object initiating the assignment (includes role, deptId, uid)
 * @param {Object} assignee - The user object receiving the assignment (includes role, deptId, uid, status)
 * @throws {Error} - "Invalid task assignment: role hierarchy violation"
 */
export const validateTaskAssignment = (assigner, assignee) => {
  if (!assigner || !assignee) {
    throw new Error("Invalid task assignment: Missing RBAC context");
  }

  // 1. No self-assignment
  if (assigner.uid === assignee.uid) {
    throw new Error("Invalid task assignment: role hierarchy violation");
  }

  // 2. No assignment to inactive or suspended users
  if (assignee.status !== "active") {
    throw new Error("Invalid task assignment: role hierarchy violation");
  }

  const assignerRole = normalizeInstitutionRoleName(assigner.role || "").trim().toLowerCase();
  const assigneeRole = normalizeInstitutionRoleName(assignee.role || "").trim().toLowerCase();

  const DEPT_ADMIN_WHITELIST = [
    "hr admin",
    "finance admin",
    "academic operations admin",
    "operations admin",
    "sales admin",
    "bvoc admin",
    "online admin",
    "open school admin",
    "skill admin"
  ];

  const ASSIGNABLE_NON_ADMIN_ROLES = new Set([
    "employee",
    "sales",
    "finance",
    "hr",
    "operations",
    "academic"
  ]);

  const assigneeIsAdmin = DEPT_ADMIN_WHITELIST.includes(assigneeRole) || assigneeRole === "organization admin" || assigneeRole === "ceo";

  // 3. CEO Branch: Allowed to assign to any Departmental Admin for systemic delegation
  if (assignerRole === "ceo") {
    if (DEPT_ADMIN_WHITELIST.includes(assigneeRole) || assigneeRole === "hr admin") {
      return true;
    }
    throw new Error("Invalid task assignment: CEO can only delegate to Departmental Administrators");
  }

  // 4. Departmental Admin Branch
  if (DEPT_ADMIN_WHITELIST.includes(assignerRole)) {
    // Strict Department Validation
    if (!assigner.deptId || !assignee.deptId || String(assigner.deptId) !== String(assignee.deptId)) {
      throw new Error("Invalid task assignment: role hierarchy violation");
    }

    const isDirectReport = assignee.reportingManagerUid && assignee.reportingManagerUid === assigner.uid;
    const isAssignableNonAdmin = ASSIGNABLE_NON_ADMIN_ROLES.has(assigneeRole);

    if (assigneeIsAdmin && !isDirectReport) {
      throw new Error("Invalid task assignment: role hierarchy violation");
    }

    if (!assigneeIsAdmin && (isAssignableNonAdmin || isDirectReport)) {
      return true;
    }

    if (isDirectReport) {
      return true;
    }

    throw new Error("Invalid task assignment: role hierarchy violation");
  }

  // 5. Default: Reject (Employee or unknown roles cannot assign tasks)
  throw new Error("Invalid task assignment: role hierarchy violation");
};
