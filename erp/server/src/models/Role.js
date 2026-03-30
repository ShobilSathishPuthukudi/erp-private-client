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
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    defaultValue: 'active',
  }
}, {
  timestamps: true
});

export default Role;
