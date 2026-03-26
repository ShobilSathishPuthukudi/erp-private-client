import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const CEOPanel = sequelize.define('ceoPanel', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  userId: {
    type: DataTypes.STRING, // Reference to User ID
    allowNull: false,
  },
  visibilityScope: {
    type: DataTypes.JSON, // Array of department IDs/Names
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('Active', 'Inactive', 'Draft'),
    defaultValue: 'Active',
  }
});

export default CEOPanel;
