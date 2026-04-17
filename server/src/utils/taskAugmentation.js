/**
 * Centralized Task Status Augmentation Utility
 * Ensures consistent 'Overdue' and 'Grace Period' logic across all institutional dashboards.
 */

export const augmentTaskStatus = (task) => {
  // Support both Sequelize instances and plain objects
  const taskData = (task && typeof task.toJSON === 'function') ? task.toJSON() : task;
  
  if (!taskData || !taskData.deadline) return taskData;

  const now = new Date();
  const deadlineDate = new Date(taskData.deadline);
  
  // 1. Basic Overdue Status
  const isOverdue = deadlineDate < now && taskData.status !== 'completed';
  const isDeptAdminReview = taskData.escalationLevel === 'DEPT_ADMIN' && taskData.status !== 'completed';
  const isEscalated = taskData.escalationLevel === 'CEO' && taskData.status !== 'completed';

  let overdueLabel = null;
  if (isEscalated) {
    overdueLabel = 'CRITICAL: ESCALATED TO CEO';
  } else if (isDeptAdminReview) {
    if (taskData.deptAdminDecision === 'GRACE_GRANTED' && taskData.deptAdminGraceUntil) {
      overdueLabel = 'Grace Granted By Department Admin';
    } else {
      overdueLabel = 'Department Admin Review Required';
    }
  } else if (isOverdue) {
    overdueLabel = 'Overdue - Administrative Action Required';
  }

  return {
    ...taskData,
    isOverdue,
    isEscalated,
    isDeptAdminReview,
    overdueLabel
  };
};

/**
 * Higher-order function to augment a collection of tasks
 */
export const augmentTaskCollection = (tasks) => {
  if (!Array.isArray(tasks)) return tasks;
  return tasks.map(augmentTaskStatus);
};
