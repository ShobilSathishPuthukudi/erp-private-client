import { models, sequelize } from './src/models/index.js';
import { Op } from 'sequelize';

async function checkCTRUserData() {
  try {
    const user = await models.User.findOne({
      where: { uid: 'CTR-693477' }
    });
    console.log('--- User CTR-693477 Data ---');
    console.log(JSON.stringify(user, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkCTRUserData();
