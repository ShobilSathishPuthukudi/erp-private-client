import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const TargetAssignment = sequelize.define('target_assignment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  targetId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  employeeUid: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  taskId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  assignedBy: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('assigned', 'completed', 'approved', 'denied', 'payout_processed', 'cancelled'),
    defaultValue: 'assigned',
  },
  assignedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  payoutId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  progressValue: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    defaultValue: 0,
  },
  financeDecisionAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  financeDecisionBy: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  financeDecisionRemarks: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
});

export default TargetAssignment;
