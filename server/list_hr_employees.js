
import { models } from './src/models/index.js';

async function listHREmployees() {
  try {
    const hrEmployees = await models.User.findAll({
      where: { deptId: 35 },
      attributes: ['uid', 'name', 'email', 'role', 'status'],
      include: [
        { model: models.Department, as: 'department', attributes: ['name'] }
      ]
    });
    console.log(JSON.stringify(hrEmployees, null, 2));
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

listHREmployees();
