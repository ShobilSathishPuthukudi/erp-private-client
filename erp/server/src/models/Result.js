import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Result = sequelize.define('result', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  studentId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  programId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  semester: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  sgpa: {
    type: DataTypes.DECIMAL(4, 2),
    allowNull: true,
  },
  cgpa: {
    type: DataTypes.DECIMAL(4, 2),
    allowNull: true,
  },
  totalCredits: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  status: {
    type: DataTypes.ENUM('pass', 'fail', 'withheld'),
    defaultValue: 'pass',
  }
});

export default Result;
