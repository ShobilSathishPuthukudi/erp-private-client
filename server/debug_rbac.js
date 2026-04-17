import sequelize from './config/db.js';
import { models } from './models/index.js';

const { OrgConfig, User } = models;

async function debug() {
  try {
    const config = await OrgConfig.findOne({ where: { key: 'GLOBAL_PERMISSION_MATRIX' } });
    if (config) {
      console.log('--- PERMISSION MATRIX ---');
      console.log(JSON.stringify(config.value.matrix, null, 2).substring(0, 1000) + '...');
      
      const hrLeaveS2 = Object.entries(config.value.matrix).map(([role, perms]) => ({
        role,
        hasS2: !!perms['HR_LEAVE_S2']
      }));
      console.log('Roles with HR_LEAVE_S2:', hrLeaveS2);
    } else {
      console.log('Matrix configuration not found!');
    }

    const testUser = await User.findOne({ where: { email: { [sequelize.Sequelize.Op.like]: '%ceo%' } } });
    if (testUser) {
      console.log('--- CEO USER ---');
      console.log(`Role: [${testUser.role}]`);
      console.log(`UID: ${testUser.uid}`);
    } else {
      console.log('CEO user not found!');
    }
  } catch (error) {
    console.error('Debug script failed:', error);
  } finally {
    await sequelize.close();
  }
}

debug();
