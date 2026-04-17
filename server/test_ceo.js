import { models } from './src/models/index.js';
import { Op } from 'sequelize';
import sequelize from './src/config/db.js';

async function test() {
  try {
    const { Department, Student, User, Invoice, Task, Lead, Leave, AuditLog, Program, OrgConfig } = models;
    const restricted = true;
    const deptIds = [86, 87, 88, 89, 90];
    const names = ['academic operations', 'online department admin', 'skill department admin', 'bvoc department admin', 'open school admin'];
    const now = new Date();

    const isFinance = false;
    const whereStudent = restricted ? { [Op.or]: [{ deptId: { [Op.in]: deptIds } }, { subDepartmentId: { [Op.in]: deptIds } }] } : {};
    const whereUser = restricted ? { [Op.or]: [{ deptId: { [Op.in]: deptIds } }, { subDepartment: { [Op.in]: names } }] } : {};

    const centerWhere = {
      type: { [Op.in]: ['partner-center', 'partner center', 'partner centers'] },
      status: 'active',
      ...(restricted ? {
        [Op.or]: [
          { id: { [Op.in]: deptIds } },
          { parentId: { [Op.in]: deptIds } },
          ...(deptIds?.length > 0 ? [{ id: { [Op.in]: sequelize.literal(`(SELECT DISTINCT centerId FROM center_programs WHERE subDeptId IN (${deptIds.join(',')}))`) } }] : [])
        ]
      } : {})
    };
    await Department.unscoped().count({ where: centerWhere });
    console.log('Center where passed');

  } catch (err) {
    console.error('ERROR OCCURRED:', err);
  }
}
test();
