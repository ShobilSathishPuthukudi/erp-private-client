import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const AuditLog = sequelize.define('auditLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  entity: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  action: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  userId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  before: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  after: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true, // Will be mandatory for financial edits via middleware
  },
  ipAddress: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  module: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  }
}, {
  timestamps: false
});

export default AuditLog;
