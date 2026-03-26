import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Lead = sequelize.define('lead', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('lead', 'contacted', 'site_visit', 'agreement', 'converted', 'lost'),
    defaultValue: 'lead',
  },
  source: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'Website',
  },
  referralCode: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  bdeId: {
    type: DataTypes.STRING, // Referring Employee UID
    allowNull: true,
  },
  expectedValue: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  closeDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  assignedTo: {
    type: DataTypes.STRING, // Links to User.uid
    allowNull: true,
  }
});

export default Lead;
