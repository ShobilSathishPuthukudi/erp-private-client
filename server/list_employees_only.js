
import { models } from './src/models/index.js';

async function listEmployees() {
  try {
    const employees = await models.User.findAll({
      where: { role: 'employee' },
      attributes: ['uid', 'name', 'email', 'deptId', 'status'],
      include: [{ model: models.Department, as: 'department', attributes: ['name'] }]
    });
    console.log(JSON.stringify(employees, null, 2));
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

listEmployees();
