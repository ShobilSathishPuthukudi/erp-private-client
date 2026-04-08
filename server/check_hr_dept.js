
import { models } from './src/models/index.js';

async function checkHRDept() {
  try {
    const dept = await models.Department.findByPk(35, {
      include: [{ model: models.User, as: 'admin', attributes: ['uid', 'name'] }]
    });
    console.log(JSON.stringify(dept, null, 2));
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

checkHRDept();
