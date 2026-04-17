import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

/**
 * PermissionVersion
 * Captured snapshots of the GLOBAL_PERMISSION_MATRIX for institutional audit.
 */
const PermissionVersion = sequelize.define('permission_version', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  versionNumber: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Monotonically increasing version identifier'
  },
  updatedBy: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'UID of the administrator who performed the update'
  },
  snapshot: {
    type: DataTypes.JSON,
    allowNull: false,
    comment: 'Full JSON matrix state at time of versioning'
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  indexes: [{ fields: ['versionNumber'] }]
});

export default PermissionVersion;
