import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Target = sequelize.define('target', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  targetableType: {
    type: DataTypes.ENUM('user', 'department', 'partner-center'),
    allowNull: false,
  },
  targetableId: {
    type: DataTypes.STRING, // UID or ID
    allowNull: false,
  },
  metric: {
    type: DataTypes.ENUM('revenue', 'enrollment', 'conversion_rate'),
    allowNull: false,
  },
  value: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('active', 'completed', 'cancelled'),
    defaultValue: 'active',
  },
  workflowStatus: {
    type: DataTypes.ENUM(
      'pending_operations',
      'verified_by_operations',
      'rejected_by_operations',
      'live',
      'under_finance_review',
      'approved_by_finance',
      'denied_by_finance',
      'disbursed',
      'pending_sales_admin',
      'approved_by_sales_admin',
      'rejected_by_sales_admin',
      'assigned',
      'completed',
      'cancelled'
    ),
    defaultValue: 'pending_sales_admin',
  },
  financeRemarks: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  eligibilityCriteria: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  operationsUid: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  operationsRemarks: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  operationsDecisionAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  financeDecisionUid: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  financeDecisionAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  financeReviewRemarks: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  nextCycleTargetValue: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
  },
  nextCycleStartDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  nextCycleEndDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  cycleName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  salesAdminUid: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  salesAdminRemarks: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  salesAdminDecisionAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  assignedBy: {
    type: DataTypes.STRING, // Finance UID
    allowNull: false,
  }
});

export default Target;
