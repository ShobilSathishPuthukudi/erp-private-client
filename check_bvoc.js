import { models } from './server/src/models/index.js';
const { User } = models;

async function checkUser() {
  try {
    const user = await User.findOne({ where: { email: 'bvoc@erp.com' } });
    if (user) {
      console.log('User found:', JSON.stringify(user, null, 2));
    } else {
      console.log('User NOT found: bvoc@erp.com');
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkUser();
