import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Leave = sequelize.define('leave', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  employeeId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  fromDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  toDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  step1By: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  step2By: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('pending_step1', 'pending_step2', 'approved', 'rejected_step1', 'rejected_step2'),
    defaultValue: 'pending_step1',
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: true,
  }
}, {
  indexes: [{ fields: ['employeeId', 'status'] }]
});

export default Leave;
