import { models, sequelize } from './src/models/index.js';
import { Op } from 'sequelize';

async function checkApiCenters() {
  try {
    const centers = await models.User.findAll({
      where: { 
        role: { [Op.in]: ['Partner Center'] },
        status: 'active'
      },
      attributes: ['uid', 'name', 'email', 'devPassword'],
      order: [['name', 'ASC']]
    });
    
    const formatted = centers.map(c => ({
      uid: c.uid,
      name: c.name,
      email: c.email,
      password: c.devPassword || 'password123'
    }));

    console.log('--- API Response (Formatted) ---');
    console.log(JSON.stringify(formatted, null, 2));

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkApiCenters();
