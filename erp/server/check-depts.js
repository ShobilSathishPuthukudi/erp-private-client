
import { models } from './src/models/index.js';
const { User, Department } = models;

async function check() {
  try {
    const users = await User.findAll({
      attributes: ['email', 'role', 'deptId', 'reportingManagerUid'],
      where: { email: ['finance@erp.com', 'hr@erp.com', 'academic@erp.com'] }
    });
    
    console.log('--- User Status ---');
    users.forEach(u => {
      console.log(`Email: ${u.email}, Role: ${u.role}, DeptId: ${u.deptId}, Manager: ${u.reportingManagerUid}`);
    });

    const depts = await Department.findAll();
    console.log('\n--- Departments ---');
    depts.forEach(d => {
      console.log(`ID: ${d.id}, Name: ${d.name}`);
    });

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
