import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const AccreditationRequest = sequelize.define('accreditation_request', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  centerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  courseName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  universityName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  type: {
    type: DataTypes.STRING, // Sub-Dept
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('pending', 'finance_pending', 'approved', 'rejected'),
    defaultValue: 'pending',
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  linkedProgramId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  assignedUniversityId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  assignedSubDeptId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  }
});

export default AccreditationRequest;
