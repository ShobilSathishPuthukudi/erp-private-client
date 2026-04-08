import dotenv from 'dotenv';
import { models, sequelize } from './models/index.js';

dotenv.config();

async function testDelete() {
  try {
    const { User } = models;
    const uid = 'STU34';
    console.log(`🔍 Testing deletion for UID: ${uid}`);
    
    const user = await User.findByPk(uid);
    if (!user) {
      console.log('❌ User not found');
      return;
    }

    try {
      await user.destroy();
      console.log('✅ Deletion successful (without transaction)');
    } catch (err) {
      console.error('❌ Deletion failed:', err.name, err.message);
      if (err.parent) console.error('Parent error:', err.parent.message);
      if (err.fields) console.error('Constraint fields:', err.fields);
    }
  } catch (error) {
    console.error('Test script error:', error);
  } finally {
    process.exit();
  }
}

testDelete();
