import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

/**
 * RolePermissionShadow
 * Flattened registry of institutional permissions for SQL-level query optimization.
 * Synchronized with GLOBAL_PERMISSION_MATRIX JSON source.
 */
const RolePermissionShadow = sequelize.define('role_permission_shadow', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  roleName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  actionId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  create: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  read: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  update: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  delete: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  approve: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  scope: {
    type: DataTypes.ENUM('GLOBAL', 'DEPARTMENT', 'CENTER', 'SELF'),
    defaultValue: 'SELF'
  },
  ownership: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  indexes: [
    { fields: ['roleName', 'actionId'], unique: true },
    { fields: ['roleName'] },
    { fields: ['actionId'] }
  ]
});

export default RolePermissionShadow;
