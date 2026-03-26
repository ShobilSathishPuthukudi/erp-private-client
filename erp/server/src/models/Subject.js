import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Subject = sequelize.define('subject', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  programId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  credits: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  }
});

export default Subject;
