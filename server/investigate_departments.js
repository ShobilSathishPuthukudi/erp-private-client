import { models, sequelize } from './src/models/index.js';
import { Op } from 'sequelize';

async function investigateDepartments() {
  try {
    const departments = await models.Department.findAll({
      where: {
        name: { [Op.like]: '%DEMO CENTER 10%' }
      },
      attributes: ['id', 'name', 'shortName', 'type', 'status']
    });
    console.log('--- Duplicate Center Departments ---');
    console.log(JSON.stringify(departments, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

investigateDepartments();
