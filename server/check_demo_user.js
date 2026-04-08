import { models, sequelize } from './src/models/index.js';
import { Op } from 'sequelize';

async function checkUserData() {
  try {
    const user = await models.User.findOne({
      where: { uid: 'DEMO ' }
    });
    console.log('--- User DEMO Data ---');
    console.log(JSON.stringify(user, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkUserData();
