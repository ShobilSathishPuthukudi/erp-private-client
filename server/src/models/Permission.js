import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Permission = sequelize.define('permission', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  role: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Target role (e.g., Dept Admin, CEO, Employee)'
  },
  module: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Module Identifier (e.g., Finance, HR, Academic)'
  },
  page: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Specific page or feature identifier'
  },
  canRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  canWrite: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  canApprove: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  }
}, {
  indexes: [
    {
      unique: true,
      fields: ['role', 'module', 'page']
    }
  ]
});

export default Permission;
