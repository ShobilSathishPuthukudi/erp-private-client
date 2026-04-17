import { models } from './src/models/index.js';
import { Op } from 'sequelize';

async function checkData() {
  try {
    const students = await models.Student.findAll({
      attributes: ['name', 'status', 'enrollStatus'],
      limit: 10
    });
    console.log('--- Students ---');
    console.log(students.map(s => s.toJSON()));

    const centers = await models.Department.findAll({
      where: { type: { [Op.like]: '%partner%' } },
      attributes: ['name', 'type', 'auditStatus'],
      limit: 10
    });
    console.log('\n--- Partner Centers ---');
    console.log(centers.map(c => c.toJSON()));

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

checkData();
