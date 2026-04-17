import Department from '../src/models/Department.js';
import User from '../src/models/User.js';
import Task from '../src/models/Task.js';
import { Op } from 'sequelize';

async function checkDuplicateDependencies() {
  try {
    const targetIds = [3, 34, 35, 38, 8, 9, 10, 11]; // Older pillars and their sub-depts

    console.log('DEPENDENCIES FOR OLDER PILLARS:');
    for (const id of targetIds) {
      const dept = await Department.findByPk(id);
      if (!dept) continue;

      const userCount = await User.count({ where: { deptId: dept.id } });
      const taskCount = await Task.count({ 
        where: { 
          [Op.or]: [
            { departmentId: dept.id },
            { subDepartmentId: dept.id }
          ]
        } 
      });
      console.log(`- ${dept.name} (ID: ${id}): ${userCount} users, ${taskCount} tasks`);
    }

  } catch (error) {
    console.error('Error checking duplicate dependencies:', error);
  } finally {
    process.exit();
  }
}

checkDuplicateDependencies();
