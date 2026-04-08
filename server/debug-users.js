import { models } from './src/models/index.js';

const { User } = models;

async function debugUsers() {
  try {
    const users = await User.findAll({
      attributes: ['uid', 'email', 'role', 'status']
    });
    console.log('--- Current Users in Database ---');
    users.forEach(u => {
      console.log(`UID: ${u.uid} | Email: ${u.email} | Role: ${u.role} | Status: ${u.status}`);
    });
    console.log('--------------------------------');
    process.exit(0);
  } catch (error) {
    console.error('Debug failed:', error);
    process.exit(1);
  }
}

debugUsers();
