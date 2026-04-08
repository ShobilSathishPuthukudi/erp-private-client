
import { models } from './src/models/index.js';
const { User, Department } = models;

async function setup() {
  try {
    const [fDept] = await Department.findOrCreate({ 
      where: { name: 'Finance' }, 
      defaults: { type: 'administrative', status: 'active' } 
    });
    const [hDept] = await Department.findOrCreate({ 
      where: { name: 'HR' }, 
      defaults: { type: 'administrative', status: 'active' } 
    });
    
    await User.update({ deptId: fDept.id }, { where: { email: 'finance@erp.com' } });
    await User.update({ deptId: hDept.id }, { where: { email: 'hr@erp.com' } });
    
    const hrUser = await User.findOne({ where: { email: 'hr@erp.com' } });
    if (hrUser) {
      await User.update(
        { deptId: hDept.id, reportingManagerUid: hrUser.uid }, 
        { where: { role: 'employee', deptId: null }, limit: 2 }
      );
    }
    
    console.log('Finance Dept ID:', fDept.id);
    console.log('HR Dept ID:', hDept.id);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

setup();
