import { models } from './src/models/index.js';

async function diagnose() {
  try {
    const user = await models.User.findOne({
      where: { name: 'Demo Sales employee' },
      attributes: ['uid', 'name', 'role', 'subDepartment']
    });
    
    const survey = await models.Survey.findByPk(5);
    
    const responses = await models.SurveyResponse.findAll({
      where: { userUid: user.uid, surveyId: 5 }
    });

    console.log(JSON.stringify({ user, survey, responses }, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

diagnose();
