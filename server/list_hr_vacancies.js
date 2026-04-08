
import { models } from './src/models/index.js';

async function listHRVacancies() {
  try {
    const vacancies = await models.Vacancy.findAll({
      where: { departmentId: 35 },
      attributes: ['id', 'title', 'count', 'filledCount', 'status']
    });
    console.log(JSON.stringify(vacancies, null, 2));
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

listHRVacancies();
