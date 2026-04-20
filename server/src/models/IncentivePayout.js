import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const IncentivePayout = sequelize.define('incentive_payout', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  ruleId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  targetId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  assignmentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  achievementPercentage: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
  },
  period: {
    type: DataTypes.STRING, // e.g., "2026-03"
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('pending_ceo', 'approved', 'rejected', 'processed'),
    defaultValue: 'pending_ceo',
  },
  ceoRemarks: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  handledByFinance: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  financeRemarks: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  processedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  }
});

export default IncentivePayout;
