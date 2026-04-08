import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, 'erp/server/.env') });

import sequelize from './server/src/config/db.js';
import { models } from './server/src/models/index.js';

const { User } = models;

async function checkAdmins() {
  try {
    const rolesToCheck = ['Organization Admin', 'Finance Admin', 'Operations Admin', 'HR Admin', 'Sales & CRM Admin', 'CEO'];
    
    console.log('--- Institutional Authority Audit ---');
    for (const roleName of rolesToCheck) {
      const users = await User.findAll({
        where: { role: roleName },
        attributes: ['uid', 'name', 'email', 'status']
      });
      console.log(`\nRole: ${roleName} (${users.length} users)`);
      users.forEach(u => console.log(`- ${u.name} (${u.email}) [Status: ${u.status}] [UID: ${u.uid}]`));
    }
    process.exit(0);
  } catch (error) {
    console.error('Audit Failed:', error);
    process.exit(1);
  }
}

checkAdmins();
