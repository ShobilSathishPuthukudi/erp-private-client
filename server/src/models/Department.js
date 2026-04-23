import { DataTypes, Op } from 'sequelize';
import sequelize from '../config/db.js';

const Department = sequelize.define('department', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  orgId: {
    type: DataTypes.UUID,
    allowNull: true, // Optional for legacy records
  },
  features: {
    type: DataTypes.JSON,
    allowNull: true, // Holds { allowCustomFee: true, enableStudentPortal: true, etc. }
  },
  shortName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  type: {
    type: DataTypes.ENUM('universities', 'branches', 'partner centers', 'departments', 'sub-departments', 'department', 'sub-department'),
    allowNull: false,
    defaultValue: 'departments',
  },
  loginId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  devPassword: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  adminId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('proposed', 'draft', 'staged', 'active', 'inactive'),
    defaultValue: 'proposed',
  },
  parentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  centerStatus: {
    type: DataTypes.ENUM('LEAD', 'SHORTLISTED', 'PROPOSED', 'APPROVED_BY_CENTER', 'REGISTERED', 'ACTIVE'),
    defaultValue: 'LEAD',
    allowNull: true,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  logo: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  sourceLeadId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  bdeId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  accreditation: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  websiteUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  affiliationDoc: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  auditStatus: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'PENDING_FINANCE'),
    defaultValue: 'pending',
  },
  rejectionReason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  financeRemarks: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  infrastructureDetails: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true,
  }
}, {
  defaultScope: {
    where: {
      name: {
        [Op.notIn]: ['Alpha Partner center']
      }
    }
  }
});

export default Department;
