import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Quotation = sequelize.define('quotation', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  leadId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  quotationNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  items: {
    type: DataTypes.JSON, // Array of { programId, programName, fees }
    allowNull: false,
  },
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  validUntil: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('draft', 'sent', 'accepted', 'expired'),
    defaultValue: 'sent',
  },
  pdfUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  createdBy: {
    type: DataTypes.STRING, // User UID
    allowNull: false,
  }
});

export default Quotation;
