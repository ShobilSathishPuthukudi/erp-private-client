import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const OrgConfig = sequelize.define('orgConfig', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  key: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  value: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  group: {
    type: DataTypes.STRING, // branding, integration, storage, academic
    allowNull: false,
  },
  isEncrypted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  }
});

export default OrgConfig;
