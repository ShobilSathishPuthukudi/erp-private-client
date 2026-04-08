
import { models } from './src/models/index.js';

async function listRoles() {
  try {
    const roles = await models.Role.findAll({
      attributes: ['id', 'name', 'description']
    });
    console.log(JSON.stringify(roles, null, 2));
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

listRoles();
