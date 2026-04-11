import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Announcement = sequelize.define('announcement', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  priority: {
    type: DataTypes.ENUM('normal', 'urgent'),
    defaultValue: 'normal',
  },
  expiryDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  targetChannel: {
    type: DataTypes.ENUM('all_employees', 'centers_only', 'hr_directives'),
    allowNull: false,
    defaultValue: 'all_employees',
  },
  programId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  universityId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  centerId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  authorId: {
    type: DataTypes.STRING, // Links to User.uid
    allowNull: false,
  }
});

export default Announcement;
