import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Survey = sequelize.define('survey', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
  targetRole: {
    type: DataTypes.STRING,
    allowNull: false, // e.g., 'student', 'employee', 'all'
  },
  questions: {
    type: DataTypes.JSON, // Array of { id, type, label, options[] }
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'active', // active, closed
  },
  createdBy: {
    type: DataTypes.STRING, 
    allowNull: false,
  },
  expiryDate: {
    type: DataTypes.DATE,
    allowNull: true,
  }
});

export default Survey;
