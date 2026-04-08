import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const PaymentDistribution = sequelize.define('payment_distribution', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  paymentId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  partnerType: {
    type: DataTypes.ENUM('university', 'platform', 'partner'),
    allowNull: false,
  },
  partnerId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('pending', 'distributed'),
    defaultValue: 'pending',
  },
  distributionDate: {
    type: DataTypes.DATE,
    allowNull: true,
  }
});

export default PaymentDistribution;
