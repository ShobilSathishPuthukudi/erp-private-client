import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Module = sequelize.define('module', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  subjectId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  }
});

export default Module;
