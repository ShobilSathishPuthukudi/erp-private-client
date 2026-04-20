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
  requestType: {
    type: DataTypes.ENUM('center_university_change', 'generic'),
    allowNull: false,
    defaultValue: 'center_university_change',
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
    type: DataTypes.ENUM('pending', 'pending_ops', 'pending_finance', 'approved', 'rejected', 'rejected_ops', 'rejected_finance'),
    defaultValue: 'pending_ops',
  },
  requestedFeeSchemaId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  opsRemarks: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  opsApprovedBy: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  opsApprovedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  financeApprovedBy: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  financeApprovedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  financeRemarks: {
    type: DataTypes.TEXT,
    allowNull: true,
  }
});

export default ChangeRequest;
