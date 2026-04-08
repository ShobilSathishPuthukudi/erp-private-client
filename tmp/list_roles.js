import { models } from './erp/server/src/models/index.js';

async function listRoles() {
  try {
    const roles = await models.Role.findAll({
      attributes: ['name', 'description', 'status'],
      raw: true
    });
    console.log(JSON.stringify(roles, null, 2));
    process.exit(0);
  } catch (error) {
    console.error('Error fetching roles:', error);
    process.exit(1);
  }
}

listRoles();
