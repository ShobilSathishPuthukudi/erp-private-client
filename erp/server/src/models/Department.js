import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Department = sequelize.define('department', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  shortName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  loginId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  devPassword: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  adminId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('proposed', 'draft', 'staged', 'active', 'inactive'),
    defaultValue: 'proposed',
  },
  centerStatus: {
    type: DataTypes.ENUM('LEAD', 'SHORTLISTED', 'PROPOSED', 'APPROVED_BY_CENTER', 'REGISTERED', 'ACTIVE'),
    defaultValue: 'LEAD',
    allowNull: true,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  logo: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  sourceLeadId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  bdeId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  accreditation: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  websiteUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  affiliationDoc: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  auditStatus: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending',
  },
  rejectionReason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  infrastructureDetails: {
    type: DataTypes.JSON,
    allowNull: true,
  }
});

export default Department;
