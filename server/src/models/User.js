import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const User = sequelize.define('user', {
  uid: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  email: {
    type: DataTypes.STRING,
    unique: 'idx_user_email',
    allowNull: false,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  devPassword: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  role: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  deptId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'suspended', 'pending_dept'),
    defaultValue: 'active',
  },
  avatar: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  subDepartment: {
    type: DataTypes.STRING, // e.g., 'Skill', 'Online', 'OpenSchool', 'BVoc'
    allowNull: true,
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  dateOfBirth: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  bio: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  referralCode: {
    type: DataTypes.STRING,
    unique: false,
    allowNull: true,
  },
  reportingManagerUid: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  reporting_manager_id: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Alias for reportingManagerUid to align with ERP architecture'
  },
  vacancyId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  baseSalary: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
  },
  leaveBalance: {
    type: DataTypes.INTEGER,
    defaultValue: 20,
  }
}, {
  timestamps: true
});

export default User;
