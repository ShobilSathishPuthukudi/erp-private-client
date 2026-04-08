import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const ChangeRequest = sequelize.define('change_request', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  centerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  currentUniversityId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  requestedUniversityId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  currentProgramId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  requestedProgramId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending',
  },
  financeRemarks: {
    type: DataTypes.TEXT,
    allowNull: true,
  }
});

export default ChangeRequest;
