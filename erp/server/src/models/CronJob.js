import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const CronJob = sequelize.define('cronJob', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  schedule: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  lastRun: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  nextRun: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'active',
  },
  lastResult: {
    type: DataTypes.TEXT,
    allowNull: true,
  }
});

export default CronJob;
