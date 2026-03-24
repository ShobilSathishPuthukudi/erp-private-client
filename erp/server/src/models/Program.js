import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Program = sequelize.define('program', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  universityId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  duration: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  subDeptId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  intakeCapacity: {
    type: DataTypes.INTEGER,
    allowNull: true,
  }
});

export default Program;
