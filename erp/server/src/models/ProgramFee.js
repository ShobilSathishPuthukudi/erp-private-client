import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const ProgramFee = sequelize.define('program_fee', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  programId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false, // e.g., "Regular Batch 2024"
  },
  schema: {
    type: DataTypes.JSON,
    allowNull: false, // { type: 'semester'|'yearly'|'emi', details: [...] }
  },
  version: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  }
});

export default ProgramFee;
