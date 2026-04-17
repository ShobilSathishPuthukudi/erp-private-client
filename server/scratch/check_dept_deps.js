import Department from '../src/models/Department.js';
import User from '../src/models/User.js';
import Task from '../src/models/Task.js';
import { Op } from 'sequelize';

async function checkDependencies() {
  try {
    const targetNames = [
      'Marketing',
      'jjh',
      'Test department 003',
      'Test department 1',
      'Sub-department 003',
      'Test sub-department 1'
    ];

    const depts = await Department.findAll({
      where: {
        name: {
          [Op.in]: targetNames
        }
      },
      raw: true
    });

    console.log('TARGET DEPARTMENTS FOUND:');
    for (const d of depts) {
      console.log(`\n--- ${d.name} (ID: ${d.id}, Type: ${d.type}) ---`);
      
      const userCount = await User.count({ where: { deptId: d.id } });
      const taskCount = await Task.count({ 
        where: { 
          [Op.or]: [
            { departmentId: d.id },
            { subDepartmentId: d.id }
          ]
        } 
      });
      
      console.log(`Users assigned: ${userCount}`);
      console.log(`Tasks assigned: ${taskCount}`);
      
      // Also check if any other departments have this as parent
      const childCount = await Department.count({ where: { parentId: d.id } });
      console.log(`Child departments: ${childCount}`);
    }

  } catch (error) {
    console.error('Error checking dependencies:', error);
  } finally {
    process.exit();
  }
}

checkDependencies();
