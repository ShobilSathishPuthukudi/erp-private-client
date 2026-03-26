import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const CenterSubDept = sequelize.define('center_sub_dept', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  centerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  subDeptName: {
    type: DataTypes.STRING, // 'OpenSchool', 'Online', 'Skill', 'BVoc'
    allowNull: false,
  }
});

export default CenterSubDept;
