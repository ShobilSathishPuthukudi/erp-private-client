import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const IncentiveRule = sequelize.define('incentive_rule', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  targetId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  structure: {
    type: DataTypes.JSON, // e.g., [{ achievement: 100, reward: 5000 }, { achievement: 120, reward: 10000 }]
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM('flat', 'percentage'),
    defaultValue: 'flat',
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  version: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  }
});

export default IncentiveRule;
