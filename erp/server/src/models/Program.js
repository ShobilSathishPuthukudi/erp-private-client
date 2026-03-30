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
  shortName: {
    type: DataTypes.STRING,
    allowNull: true,
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
  },
  type: {
    type: DataTypes.STRING, 
    allowNull: false, // BVoc, Skill, Online, OpenSchool, etc.
  },
  status: {
    type: DataTypes.ENUM('draft', 'active', 'open'),
    defaultValue: 'draft',
  },
  eligibility: {
    type: DataTypes.JSON,
    allowNull: true, // Rules for student validation
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  totalFee: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0.00
  },
  paymentStructure: {
    type: DataTypes.JSON,
    allowNull: true, // e.g., ['monthly', 'yearly', 'custom']
  },
  tenure: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  },
  syllabusDoc: {
    type: DataTypes.STRING,
    allowNull: true,
  }
});

export default Program;
