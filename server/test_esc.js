import { models } from './src/models/index.js';
import { Op } from 'sequelize';

async function test() {
  try {
    const { Task } = models;
    const tasks = await Task.unscoped().findAll({
      where: {
        escalationLevel: 'CEO'
      },
      attributes: ['id', 'assignedTo', 'status']
    });
    console.log(tasks.map(t => t.toJSON()));
  } catch(e) {
    console.error(e);
  }
}
test();
