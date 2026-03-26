import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Deal = sequelize.define('deal', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  leadId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  value: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  },
  status: {
    type: DataTypes.ENUM('negotiation', 'agreement_sent', 'signed', 'lost'),
    defaultValue: 'negotiation',
  },
  expectedCloseDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  createdBy: {
    type: DataTypes.STRING, // User UID
    allowNull: false,
  }
});

export default Deal;
