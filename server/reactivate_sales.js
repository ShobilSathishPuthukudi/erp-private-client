import { models } from './src/models/index.js';
import { Op } from 'sequelize';

async function reactivateSalesUsers() {
  try {
    const [updatedCount] = await models.User.update(
      { status: 'active' },
      { 
        where: { 
          role: 'Sales & CRM Admin',
          status: 'suspended'
        } 
      }
    );
    
    console.log(`Successfully reactivated ${updatedCount} User(s).`);
    process.exit(0);
  } catch (err) {
    console.error('Reactivation failed:', err);
    process.exit(1);
  }
}

reactivateSalesUsers();
