import dotenv from 'dotenv';
dotenv.config({ path: './server/.env' });
import { models } from './server/src/models/index.js';
const { User } = models;

async function dumpUsers() {
  try {
    const users = await User.findAll({ attributes: ['uid', 'name', 'email', 'role', 'status'] });
    console.log('User Roster:');
    users.forEach(u => console.log(`- ${u.uid}: ${u.name} (${u.email}) [Role: ${u.role}, Status: ${u.status}]`));
    process.exit(0);
  } catch (err) {
    console.error('Failed to dump users:', err.message);
    process.exit(1);
  }
}

dumpUsers();
