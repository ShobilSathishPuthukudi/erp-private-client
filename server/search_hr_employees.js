
import { models } from './src/models/index.js';
import { Op } from 'sequelize';

async function searchHREmployees() {
  try {
    const hrEmployees = await models.User.findAll({
      where: {
        [Op.or]: [
          { deptId: 35 },
          { role: { [Op.like]: '%HR%' } }
        ]
      },
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

searchHREmployees();
