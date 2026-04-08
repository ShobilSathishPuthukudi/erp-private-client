
import { models } from './src/models/index.js';

async function checkPendingUsers() {
  try {
    const users = await models.User.findAll({
      where: { status: 'pending_dept' },
      attributes: ['uid', 'name', 'email', 'deptId', 'status'],
      include: [{ model: models.Department, as: 'department', attributes: ['name'] }]
    });
    console.log(JSON.stringify(users, null, 2));
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

checkPendingUsers();
