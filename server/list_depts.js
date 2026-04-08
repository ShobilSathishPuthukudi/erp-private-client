
import { models } from './src/models/index.js';

async function listDepartments() {
  try {
    const departments = await models.Department.findAll({
      attributes: ['id', 'name']
    });
    console.log(JSON.stringify(departments, null, 2));
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

listDepartments();
