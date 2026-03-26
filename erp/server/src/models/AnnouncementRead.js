import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const AnnouncementRead = sequelize.define('announcement_read', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  announcementId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  }
});

export default AnnouncementRead;
