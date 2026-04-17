import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Role = sequelize.define('role', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: 'Role identifier (e.g., Dept Admin, CEO)'
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  isCustom: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  type: {
    type: DataTypes.STRING,
    defaultValue: 'Custom',
  },
  department: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  scopeType: {
    type: DataTypes.ENUM('institutional', 'core_department', 'sub_department'),
    defaultValue: 'institutional',
  },
  scopeDepartmentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  scopeSubDepartment: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  assignedUserUid: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  isSeeded: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  isAdminEligible: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  isAudited: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    defaultValue: 'active',
  },
  roleId: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
    comment: 'Automatically generated unique role identifier'
  },
  rolePassword: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Hashed password for login-enabled roles'
  }
}, {
  timestamps: true
});

export default Role;
