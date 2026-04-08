
import { models } from './src/models/index.js';

async function listAllUsers() {
  try {
    const users = await models.User.findAll({
      attributes: ['uid', 'name', 'email', 'role', 'deptId', 'status'],
      include: [{ model: models.Department, as: 'department', attributes: ['name'] }]
    });
    console.log(JSON.stringify(users, null, 2));
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

listAllUsers();
