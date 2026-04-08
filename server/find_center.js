import { models } from './src/models/index.js';
import sequelize from './src/config/db.js';

async function findCenter() {
  try {
    const depts = await models.Department.findAll({
      where: { type: ['center', 'study-center'] }
    });
    console.log("All Center Departments:");
    depts.forEach(d => {
      console.log(`- ID: ${d.id}, Name: ${d.name}, Type: ${d.type}, AdminId: ${d.adminId}`);
    });

    const users = await models.User.findAll({
      where: { role: ['center', 'study-center'] }
    });
    console.log("\nAll Center Users:");
    users.forEach(u => {
      console.log(`- UID: ${u.uid}, Name: ${u.name}, Email: ${u.email}, DeptID: ${u.deptId}`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    await sequelize.close();
  }
}
findCenter();
