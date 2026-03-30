import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const AcademicActionRequest = sequelize.define('academic_action_request', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  entityType: {
    type: DataTypes.ENUM('Program', 'University', 'Student', 'Subject', 'AdmissionSession'),
    allowNull: false,
  },
  entityId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  actionType: {
    type: DataTypes.ENUM('EDIT', 'DELETE'),
    allowNull: false,
  },
  proposedData: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending',
  },
  requesterId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  approvedBy: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  financeRemarks: {
    type: DataTypes.TEXT,
    allowNull: true,
  }
});

export default AcademicActionRequest;
