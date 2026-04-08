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
  email: {
    type: DataTypes.STRING,
    allowNull: true,
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
  },
  documents: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  attemptCount: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },
  lastRejectionReason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  reviewStage: {
    type: DataTypes.ENUM('SUB_DEPT', 'OPS', 'FINANCE'),
    defaultValue: 'SUB_DEPT',
  },
  reviewedBy: {
    type: DataTypes.STRING, // User UID
    allowNull: true,
  },
  subDepartmentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('DRAFT', 'PENDING_REVIEW', 'OPS_APPROVED', 'FINANCE_PENDING', 'PAYMENT_VERIFIED', 'FINANCE_APPROVED', 'REJECTED', 'ENROLLED'),
    defaultValue: 'DRAFT',
  },
  reviewedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  resubmittedTo: {
    type: DataTypes.ENUM('SUB_DEPT', 'OPS'),
    allowNull: true,
  },
  resubmissionDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  sessionId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  invoiceId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  uid: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: true,
  },
  paidAmount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  pendingAmount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  currentSemester: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },
  nextSessionId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  reregStatus: {
    type: DataTypes.ENUM('none', 'pending', 'approved', 'carried_forward'),
    defaultValue: 'none',
  },
  reregStage: {
    type: DataTypes.INTEGER,
    defaultValue: 0, // 0: none, 1: requested, 2: finance_verified
  },
  lmsStatus: {
    type: DataTypes.ENUM('pending', 'synced'),
    defaultValue: 'pending',
  }
// }, {
//   indexes: [{ fields: ['deptId', 'enrollStatus'] }]
});

export default Student;
