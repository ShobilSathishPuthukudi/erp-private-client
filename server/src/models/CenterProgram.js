import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const CenterProgram = sequelize.define('center_program', {
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
  feeSchemaId: {
    type: DataTypes.INTEGER,
    allowNull: true, // Defined by Finance
  },
  subDeptId: {
    type: DataTypes.INTEGER,
    allowNull: true, // Derived from Program
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  }
});

export default CenterProgram;
