import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Invoice = sequelize.define('invoice', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  paymentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  studentId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  invoiceNo: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  gst: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  total: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('draft', 'issued', 'paid', 'cancelled'),
    defaultValue: 'draft',
  },
  salesUserId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  centerId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  }
});

export default Invoice;
