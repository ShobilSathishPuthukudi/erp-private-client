import { models } from './server/src/models/index.js';
import { Op } from 'sequelize';

async function check() {
  const depts = await models.Department.unscoped().findAll({
    where: { status: 'active' },
    attributes: ['id', 'name', 'type', 'parentId']
  });
  console.log('All Active Depts:', JSON.stringify(depts, null, 2));

  const programs = await models.Program.unscoped().findAll({
    where: { status: 'active' },
    attributes: ['id', 'name', 'subDeptId']
  });
  console.log('All Active Programs:', JSON.stringify(programs, null, 2));
}

check().catch(console.error);
