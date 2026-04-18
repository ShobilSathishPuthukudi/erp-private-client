import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const EmployeeHRRequest = sequelize.define('employee_hr_request', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  employeeId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  subject: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  category: {
    type: DataTypes.ENUM('general', 'leave', 'payroll', 'documents', 'attendance', 'policy'),
    allowNull: false,
    defaultValue: 'general',
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('open', 'in_review', 'resolved'),
    allowNull: false,
    defaultValue: 'open',
  },
  hrResponse: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  respondedBy: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  respondedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  }
});

export default EmployeeHRRequest;
