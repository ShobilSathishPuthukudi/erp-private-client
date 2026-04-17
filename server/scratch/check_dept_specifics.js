import User from '../src/models/User.js';
import Task from '../src/models/Task.js';
import { Op } from 'sequelize';

async function checkSpecifics() {
  try {
    const userInSub3 = await User.findOne({ where: { deptId: 78 } });
    if (userInSub3) {
      console.log('USER IN Sub-department 003:');
      console.log(`- Name: ${userInSub3.name}, UID: ${userInSub3.uid}, Email: ${userInSub3.email}`);
    }

    const taskInMarketing = await Task.findOne({ where: { departmentId: 57 } });
    if (taskInMarketing) {
      console.log('\nTASK IN Marketing:');
      console.log(`- Title: ${taskInMarketing.title}, ID: ${taskInMarketing.id}`);
    }

  } catch (error) {
    console.error('Error checking specifics:', error);
  } finally {
    process.exit();
  }
}

checkSpecifics();
