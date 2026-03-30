import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const LeadTouchpoint = sequelize.define('lead_touchpoint', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  leadId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM('call', 'email', 'meeting', 'note', 'STAGE_CHANGE'),
    allowNull: false,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  outcome: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  nextAction: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  createdBy: {
    type: DataTypes.STRING, // User UID
    allowNull: false,
  }
});

export default LeadTouchpoint;
