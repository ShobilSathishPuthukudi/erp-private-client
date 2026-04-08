import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Exam = sequelize.define('exam', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false, // e.g., "Summer Semester 2026"
  },
  programId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  batch: {
    type: DataTypes.STRING, 
    allowNull: false, // e.g., "2024-2026"
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('scheduled', 'completed', 'published'),
    defaultValue: 'scheduled',
  },
  sessionId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  }
});

export default Exam;
