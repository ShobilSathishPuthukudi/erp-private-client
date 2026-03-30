import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Referral = sequelize.define('referral', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: 'users',
      key: 'uid'
    }
  },
  code: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  }
});

export default Referral;
