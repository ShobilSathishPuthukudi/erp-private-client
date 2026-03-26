import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Target = sequelize.define('target', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  targetableType: {
    type: DataTypes.ENUM('user', 'department', 'center'),
    allowNull: false,
  },
  targetableId: {
    type: DataTypes.STRING, // UID or ID
    allowNull: false,
  },
  metric: {
    type: DataTypes.ENUM('revenue', 'enrollment', 'conversion_rate'),
    allowNull: false,
  },
  value: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('active', 'completed', 'cancelled'),
    defaultValue: 'active',
  },
  assignedBy: {
    type: DataTypes.STRING, // Finance UID
    allowNull: false,
  }
});

export default Target;
