import { models } from './src/models/index.js';
const { User } = models;
import { Op } from 'sequelize';

async function test() {
  const code = 'EMP-081425';
  const bde = await User.findOne({
    where: { 
      [Op.or]: [
        { referralCode: code },
        { uid: code }
      ],
      role: { [Op.in]: ['Sales & CRM Admin', 'Employee', 'employee'] }
    }
  });

  if (bde) {
    console.log('Found:', bde.toJSON());
  } else {
    console.log('Not found');
    const allUsers = await User.findAll({ where: { uid: code } });
    console.log('All matching UID:', allUsers.map(u => u.toJSON()));
  }
}

test().then(() => process.exit());
