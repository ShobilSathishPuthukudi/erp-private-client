import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Student = sequelize.define('student', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  deptId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  centerId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  programId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  enrollStatus: {
    type: DataTypes.STRING,
    defaultValue: 'pending',
  },
  feeStatus: {
    type: DataTypes.STRING,
    defaultValue: 'unpaid',
  },
  marks: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  feeSchemaId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  verificationLogs: {
    type: DataTypes.JSON, // History of Ops -> Sub-Dept -> Finance approvals
    allowNull: true,
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true,
  }
// }, {
//   indexes: [{ fields: ['deptId', 'enrollStatus'] }]
});

export default Student;
