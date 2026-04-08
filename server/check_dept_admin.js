import { models, sequelize } from './src/models/index.js';

async function checkDeptAdmin() {
  try {
    const dept = await models.Department.findByPk(71);
    console.log('--- Department 71 Data ---');
    console.log(JSON.stringify(dept, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkDeptAdmin();
