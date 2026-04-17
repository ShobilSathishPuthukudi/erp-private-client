import { models } from './src/models/index.js';
import { Op } from 'sequelize';

async function test() {
  const { Task, User, Department } = models;
  const tasksRaw = await Task.findAll({
    where: {
      status: { [Op.ne]: 'completed' },
      escalationLevel: 'CEO'
    },
    include: [
      {
        model: User,
        as: 'assignee',
        attributes: ['uid', 'name', 'email', 'deptId'],
        required: true,
        include: [{
          model: Department,
          as: 'department',
          required: false,
          attributes: ['id', 'name'],
          include: [{ model: User, as: 'admin', required: false, attributes: ['name', 'email'] }]
        }]
      }
    ]
  });
  console.log(`tasksRaw count:`, tasksRaw.length);
}
test();
