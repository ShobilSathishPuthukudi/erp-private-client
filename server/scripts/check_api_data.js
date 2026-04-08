import User from '../src/models/User.js';
import Department from '../src/models/Department.js';

async function check() {
  try {
    const subDepts = await Department.findAll({
      where: { type: ['BVoc', 'Skill', 'OpenSchool', 'Online'] },
      attributes: ['id', 'name']
    });

    const opsManagers = await User.findAll({
      where: { role: 'operations' },
      attributes: ['uid', 'name']
    });

    const salesStaff = await User.findAll({
      where: { role: ['sales', 'employee'] },
      attributes: ['uid', 'name']
    });

    console.log('--- DIAGNOSTIC REPORT ---');
    console.log('Sub-Depts Found:', subDepts.length);
    console.log('Ops Managers Found:', opsManagers.length);
    console.log('Sales/Employee Staff Found:', salesStaff.length);
    console.log('Sales Staff List:', JSON.stringify(salesStaff, null, 2));
    console.log('-------------------------');
  } catch (err) {
    console.error('Diagnostic error:', err);
  }
  process.exit(0);
}

check();
