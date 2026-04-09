const { models } = require('./server/src/models/index.js');

async function listSurveys() {
  try {
    const surveys = await models.Survey.findAll({
      attributes: ['id', 'title', 'targetRole', 'status', 'expiryDate', 'createdAt'],
      order: [['createdAt', 'DESC']]
    });
    
    console.log(JSON.stringify(surveys, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

listSurveys();
