import { DataTypes, Op } from 'sequelize';
import sequelize from '../config/db.js';
import { validateTaskAssignment } from '../utils/rbac/validateTaskAssignment.js';


const Task = sequelize.define('task', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  assignedTo: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  assignedBy: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  deadline: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
    defaultValue: 'medium',
  },
  status: {
    type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'overdue', 'reassigned_escalated', 'resolved_by_ceo'),
    defaultValue: 'pending',
  },
  evidenceUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  escalatedFrom: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  escalationReason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  escalationLevel: {
    type: DataTypes.ENUM('EMPLOYEE', 'DEPT_ADMIN', 'CEO'),
    defaultValue: 'EMPLOYEE',
  },
  escalatedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  deptAdminNotifiedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  deptAdminGraceUntil: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  deptAdminDecision: {
    type: DataTypes.ENUM('PENDING_REVIEW', 'GRACE_GRANTED', 'ESCALATED_TO_CEO'),
    allowNull: true,
  },
  departmentId: {
    type: DataTypes.INTEGER,
    allowNull: true, // Nullable for legacy or global tasks
  },
  subDepartmentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  isInstitutionalHandover: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  }
}, {
  indexes: [{ fields: ['assignedTo', 'status'] }],
  paranoid: true, // Supports deletedAt for non-destructive deletes
  defaultScope: {
    where: {
      title: {
        [Op.notIn]: ['Complete q3 auditing', 'Demo task 2']
      }
    }
  }
});

// RBAC Model-Level Safety Guards
Task.beforeCreate(async (task, options) => {
  if (!options.context?.assigner) {
    throw new Error("RBAC context missing");
  }
  // Runtime Model Resolution: Avoid race conditions in multi-provider environments
  const User = task.constructor.sequelize.models.user;
  if (!User) throw new Error("Internal Server Error: User model resolution failed");

  const assignee = await User.findOne({ where: { uid: task.assignedTo } });
  if (!assignee) throw new Error("Invalid task assignment: role hierarchy violation");
  
  validateTaskAssignment(options.context.assigner, assignee);
});

Task.beforeUpdate(async (task, options) => {
  if (task.changed('assignedTo')) {
    if (!options.context?.assigner) {
      throw new Error("RBAC context missing");
    }
    // Runtime Model Resolution
    const User = task.constructor.sequelize.models.user;
    if (!User) throw new Error("Internal Server Error: User model resolution failed");

    const assignee = await User.findOne({ where: { uid: task.assignedTo } });
    if (!assignee) throw new Error("Invalid task assignment: role hierarchy violation");
    
    validateTaskAssignment(options.context.assigner, assignee);
  }
});

export default Task;
