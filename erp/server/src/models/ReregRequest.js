import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const ReregRequest = sequelize.define('rereg_request', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  studentId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  targetSemester: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  targetYear: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  paymentProof: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  amountPaid: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('pending', 'verified', 'rejected', 'carryforward'),
    defaultValue: 'pending',
  },
  cycle: {
    type: DataTypes.STRING, // e.g., "2026-Semester2"
    allowNull: false,
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  verifiedBy: {
    type: DataTypes.STRING,
    allowNull: true,
  }
});

export default ReregRequest;
