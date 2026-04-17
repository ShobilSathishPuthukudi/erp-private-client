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

  const assignerRole = (assigner.role || "").trim().toLowerCase();
  const assigneeRole = (assignee.role || "").trim().toLowerCase();

  const DEPT_ADMIN_WHITELIST = [
    "hr admin",
    "finance admin",
    "academic operations admin",
    "operations admin",
    "academic ops admin",
    "sales & crm admin",
    "bvoc dept admin",
    "bvoc department admin",
    "online dept admin",
    "online department admin",
    "open school admin",
    "skill dept admin",
    "skill department admin"
  ];

  // 3. CEO Branch: strictly HR Admin only
  if (assignerRole === "ceo") {
    if (assigneeRole !== "hr admin") {
      throw new Error("Invalid task assignment: CEO can only assign tasks to HR Admin");
    }
    return true;
  }

  // 4. Departmental Admin Branch
  if (DEPT_ADMIN_WHITELIST.includes(assignerRole)) {
    // Only allow assignment to 'Employee'
    if (assigneeRole !== "employee") {
      throw new Error("Invalid task assignment: role hierarchy violation");
    }

    // Strict Department Validation
    if (!assigner.deptId || !assignee.deptId || String(assigner.deptId) !== String(assignee.deptId)) {
      throw new Error("Invalid task assignment: role hierarchy violation");
    }

    return true; // Valid Admin → Dept Employee assignment
  }

  // 5. Default: Reject (Employee or unknown roles cannot assign tasks)
  throw new Error("Invalid task assignment: role hierarchy violation");
};
