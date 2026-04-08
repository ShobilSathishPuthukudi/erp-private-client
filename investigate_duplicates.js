import { models } from './server/src/models/index.js';
import { Op } from 'sequelize';

async function findDuplicateCenters() {
  try {
    const users = await models.User.findAll({
      where: {
        name: { [Op.like]: '%DEMO CENTER 10%' },
        role: 'Partner Center',
        status: 'active'
      },
      attributes: ['uid', 'name', 'email', 'role']
    });
    console.log('--- Duplicate Center Users ---');
    console.log(JSON.stringify(users, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

findDuplicateCenters();
