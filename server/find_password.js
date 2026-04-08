import { models, sequelize } from './src/models/index.js';
import { Op } from 'sequelize';

async function findRealPassword() {
  try {
    // Check if any user has a devPassword for Demo center 10
    const users = await models.User.findAll({
      where: {
        name: { [Op.like]: '%Demo center 10%' }
      },
      attributes: ['uid', 'name', 'devPassword', 'password']
    });
    console.log('--- User Data for Demo center 10 ---');
    console.log(JSON.stringify(users, null, 2));

    // Check Department record again
    const dept = await models.Department.findOne({
      where: { name: { [Op.like]: '%Demo center 10%' } }
    });
    console.log('--- Department Data for Demo center 10 ---');
    console.log(JSON.stringify(dept, null, 2));

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

findRealPassword();
