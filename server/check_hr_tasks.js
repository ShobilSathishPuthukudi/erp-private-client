
import { models } from './src/models/index.js';
import { Op } from 'sequelize';

async function checkHRTasks() {
  try {
    const tasks = await models.Task.findAll({
      where: { departmentId: 35 },
      include: [
        { model: models.User, as: 'assignee', attributes: ['uid', 'name', 'role'] }
      ]
    });
    console.log(JSON.stringify(tasks, null, 2));
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

checkHRTasks();
