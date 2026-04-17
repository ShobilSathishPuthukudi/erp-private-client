
import { models } from './src/models/index.js';
import { Op } from 'sequelize';
import { getDepartmentNameAliases, normalizeDepartmentName } from './src/config/institutionalStructure.js';
const { User, Department } = models;

async function setup() {
  try {
    const findOrCreateDepartment = async (name) => {
      const existingDepartment = await Department.findOne({
        where: { name: { [Op.in]: getDepartmentNameAliases(name) } },
        order: [['id', 'ASC']],
      });

      return existingDepartment || Department.create({
        name: normalizeDepartmentName(name),
        type: 'departments',
        status: 'active',
      });
    };

    const fDept = await findOrCreateDepartment('Finance');
    const hDept = await findOrCreateDepartment('HR');
    
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
