import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const ReregConfig = sequelize.define('rereg_config', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  programId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  deadline: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  autoApprovalThreshold: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  escalationDays: {
    type: DataTypes.INTEGER,
    defaultValue: 7,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  }
});

export default ReregConfig;
