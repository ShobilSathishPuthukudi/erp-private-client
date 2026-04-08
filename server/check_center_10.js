import { models } from './src/models/index.js';
import { Op } from 'sequelize';

async function checkCenter() {
  try {
    const center = await models.Department.findOne({
      where: { name: 'Demo center 10' }
    });
    
    if (!center) {
      console.log('Center not found');
      return;
    }
    
    console.log('Center Metadata:', JSON.stringify(center.metadata, null, 2));
    
    const programIds = center.metadata?.primaryInterest?.programIds || [];
    if (programIds.length > 0) {
      const programs = await models.Program.findAll({
        where: { id: { [Op.in]: programIds } }
      });
      console.log('Selected Programs:', programs.map(p => p.name).join(', '));
    } else {
       console.log('No programs selected');
    }
  } catch (err) {
    console.error('Error fetching center details:', err.stack);
  } finally {
    process.exit();
  }
}

checkCenter();
