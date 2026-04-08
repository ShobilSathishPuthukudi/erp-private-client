
import { models } from './src/models/index.js';

async function findEmployeeByVacancy() {
  try {
    const user = await models.User.findOne({
      where: { vacancyId: 6 },
      attributes: ['uid', 'name', 'email', 'role', 'deptId', 'status'],
      include: [{ model: models.Department, as: 'department', attributes: ['name'] }]
    });
    console.log(JSON.stringify(user, null, 2));
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

findEmployeeByVacancy();
