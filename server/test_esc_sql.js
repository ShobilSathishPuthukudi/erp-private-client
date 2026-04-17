import { models } from './src/models/index.js';
import { Op } from 'sequelize';

async function test() {
  const { Task, User, Department } = models;
  await Task.findAll({
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
          attributes: ['id', 'name'],
          include: [{ model: User, as: 'admin', attributes: ['name', 'email'] }]
        }]
      }
    ],
    logging: (msg) => console.log(msg)
  });
}
test();
