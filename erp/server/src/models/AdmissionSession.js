import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const AdmissionSession = sequelize.define('admission_session', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false, // e.g., "Batch 2026 Phase 1"
  },
  programId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  subDeptId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  centerId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  startDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  endDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  maxCapacity: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  financeStatus: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending',
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  createdBySubDept: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  createdBy: {
    type: DataTypes.STRING, // User UID
    allowNull: true,
  },
  approvalStatus: {
    type: DataTypes.ENUM('DRAFT', 'PENDING_APPROVAL', 'APPROVED'),
    defaultValue: 'DRAFT',
  },
  sessionType: {
    type: DataTypes.ENUM('ACADEMIC', 'ADMISSION'),
    defaultValue: 'ADMISSION',
  },
  academicSessionId: {
    type: DataTypes.INTEGER,
    allowNull: true, // Self-reference for Admission sessions to link to Academic sessions
  }
});

export default AdmissionSession;
