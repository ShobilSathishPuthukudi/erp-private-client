import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const File = sequelize.define('file', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  ownerId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  storagePath: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  signedUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  urlExpiry: {
    type: DataTypes.DATE,
    allowNull: true,
  }
}, {
  createdAt: 'uploadedAt',
  updatedAt: false
});

export default File;
