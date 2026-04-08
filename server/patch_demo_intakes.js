import { models } from './src/models/index.js';
import sequelize from './src/config/db.js';

async function patchDemoCenterIntakes() {
  try {
    const center = await models.User.findOne({
      where: { email: 'demo-center@erp.com' }
    });

    if (!center) {
      console.log('Demo center not found');
      return;
    }

    const centerId = center.deptId;
    console.log(`Patching intakes for centerId: ${centerId}`);

    // Get all authorized programs for this center
    const centerPrograms = await models.CenterProgram.findAll({
      where: { centerId, isActive: true }
    });
    
    console.log(`Found ${centerPrograms.length} authorized programs without guaranteed intakes`);

    let createdCount = 0;
    for (const mapping of centerPrograms) {
      const [session, created] = await models.AdmissionSession.findOrCreate({
        where: { 
             centerId: centerId, 
             programId: mapping.programId,
             name: 'Spring 2026 Batch',
        },
        defaults: {
          subDeptId: mapping.subDeptId || 1,
          startDate: new Date(),
          endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
          maxCapacity: 100,
          isActive: true,
          approvalStatus: 'APPROVED',
          sessionType: 'ADMISSION'
        }
      });
      if (created) createdCount++;
    }

    console.log(`Created ${createdCount} new active intake batches for Demo Center`);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await sequelize.close();
  }
}

patchDemoCenterIntakes();
