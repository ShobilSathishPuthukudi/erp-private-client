import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Mark = sequelize.define('mark', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  studentId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  examId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  subjectName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  subjectCode: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  theoryMarks: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0,
  },
  practicalMarks: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0,
  },
  internalMarks: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0,
  },
  totalMarks: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0,
  },
  grade: {
    type: DataTypes.STRING(2),
    allowNull: true, // e.g., "A+", "B"
  }
});

export default Mark;
