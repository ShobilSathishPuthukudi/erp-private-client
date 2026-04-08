import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const CustomField = sequelize.define('customField', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  entityType: {
    type: DataTypes.STRING, // Student, Employee
    allowNull: false,
  },
  label: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  fieldType: {
    type: DataTypes.STRING, // Text, Number, Dropdown, etc.
    allowNull: false,
  },
  options: {
    type: DataTypes.JSON, // For dropdowns
    allowNull: true,
  },
  isRequired: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  }
});

export default CustomField;
