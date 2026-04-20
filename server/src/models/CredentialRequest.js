import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const CredentialRequest = sequelize.define('credential_request', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  centerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  requesterId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      len: [30, 2000]
    }
  },
  ipAddress: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM('VIEW', 'RESET'),
    defaultValue: 'VIEW',
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'cancelled'),
    defaultValue: 'pending',
  },
  revealUntil: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  approvedBy: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  rejectionRemarks: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  viewedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  viewedBy: {
    type: DataTypes.STRING,
    allowNull: true,
  }
});

export default CredentialRequest;
