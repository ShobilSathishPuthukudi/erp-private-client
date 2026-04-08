import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const ProgramOffering = sequelize.define('program_offering', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  centerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  programId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('pending', 'open', 'closed'),
    defaultValue: 'open',
  },
  accreditationRequestId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  }
});

export default ProgramOffering;
