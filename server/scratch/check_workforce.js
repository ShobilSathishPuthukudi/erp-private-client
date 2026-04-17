import { sequelize, models } from '../src/models/index.js';
import { Op } from 'sequelize';

async function check() {
  try {
    await sequelize.authenticate();
    const workforce = await models.User.findAll({
      where: {
        status: 'active',
        role: { [Op.notIn]: ['student', 'Student', 'Partner Center', 'partner-center'] },
      },
      attributes: ['name', 'role', 'status'],
    });

    console.log('Workforce Count:', workforce.length);
    console.table(workforce.map(w => w.toJSON()));
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

check();
