import Department from '../src/models/Department.js';
import User from '../src/models/User.js';
import Task from '../src/models/Task.js';
import Program from '../src/models/Program.js';
import Student from '../src/models/Student.js';
import { Op } from 'sequelize';

async function checkCoreDependencies() {
  try {
    const targetIds = [1, 31]; // IITS RPS and IITS Global Campus

    for (const id of targetIds) {
      const dept = await Department.findByPk(id);
      if (!dept) {
        console.log(`\n--- ID ${id} NOT FOUND ---`);
        continue;
      }
      console.log(`\n--- ${dept.name} (ID: ${dept.id}, Type: ${dept.type}) ---`);
      
      const userCount = await User.count({ where: { deptId: dept.id } });
      const taskCount = await Task.count({ 
        where: { 
          [Op.or]: [
            { departmentId: dept.id },
            { subDepartmentId: dept.id }
          ]
        } 
      });
      const programCount = await Program.count({ where: { universityId: dept.id } });
      const studentCount = await Student.count({ 
        where: { 
          [Op.or]: [
            { deptId: dept.id },
            { centerId: dept.id }
          ]
        } 
      });
      
      console.log(`Users assigned: ${userCount}`);
      console.log(`Tasks assigned: ${taskCount}`);
      console.log(`Programs linked (as University): ${programCount}`);
      console.log(`Students linked (as University/Center): ${studentCount}`);
    }

  } catch (error) {
    console.error('Error checking core dependencies:', error);
  } finally {
    process.exit();
  }
}

checkCoreDependencies();
