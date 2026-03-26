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
  syllabusDoc: {
    type: DataTypes.STRING,
    allowNull: true,
  }
});

export default Program;
