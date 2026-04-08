import { models, sequelize } from './src/models/index.js';
import { Op } from 'sequelize';

async function checkDeptUsage() {
  try {
    const studentCount = await models.Student.count({
      where: { centerId: 71 }
    });
    console.log('--- Student Count for Dept 71 ---');
    console.log(studentCount);
    
    const leadCount = await models.Lead.count({
      where: { centerId: 71 }
    });
    console.log('--- Lead Count for Dept 71 ---');
    console.log(leadCount);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkDeptUsage();
