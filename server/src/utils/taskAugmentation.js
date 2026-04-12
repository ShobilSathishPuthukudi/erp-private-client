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
  
  // 2. Grace Period Logic: 24 Hours after deadline
  const gracePeriodThreshold = new Date(deadlineDate.getTime() + (24 * 60 * 60 * 1000));
  const isEscalated = now > gracePeriodThreshold && taskData.status !== 'completed';

  return {
    ...taskData,
    isOverdue,
    isEscalated,
    overdueLabel: isEscalated 
      ? 'CRITICAL: ESCALATED TO CEO' 
      : (isOverdue ? 'Overdue - Administrative Action Required' : null)
  };
};

/**
 * Higher-order function to augment a collection of tasks
 */
export const augmentTaskCollection = (tasks) => {
  if (!Array.isArray(tasks)) return tasks;
  return tasks.map(augmentTaskStatus);
};
