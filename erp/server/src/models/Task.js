import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

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
    type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'overdue'),
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
    type: DataTypes.ENUM('EMPLOYEE', 'MANAGER', 'CEO'),
    defaultValue: 'EMPLOYEE',
  },
  escalatedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  }
}, {
  indexes: [{ fields: ['assignedTo', 'status'] }]
});

export default Task;
