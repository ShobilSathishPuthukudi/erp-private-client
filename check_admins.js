import sequelize from './server/src/config/db.js';
import { models } from './server/src/models/index.js';

const { User } = models;

async function checkUsers() {
  try {
    const users = await User.findAll({
      where: { role: 'Organization Admin' },
      attributes: ['uid', 'name', 'email']
    });
    console.log('--- Organization Admin Users ---');
    users.forEach(u => console.log(`- ${u.name} (${u.email}) [UID: ${u.uid}]`));
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

checkUsers();
