import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const SurveyResponse = sequelize.define('survey_response', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  surveyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  userUid: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  answers: {
    type: DataTypes.JSON, // Object of { questionId: answer }
    allowNull: false,
  }
});

export default SurveyResponse;
