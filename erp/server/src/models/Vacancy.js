import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Vacancy = sequelize.define('vacancy', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  departmentId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  subDepartment: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  count: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },
  filledCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  status: {
    type: DataTypes.ENUM('OPEN', 'CLOSED'),
    defaultValue: 'OPEN',
  },
  requirements: {
    type: DataTypes.TEXT,
    allowNull: true,
  }
});

export default Vacancy;
