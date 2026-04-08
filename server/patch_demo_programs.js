import { models } from './src/models/index.js';
import sequelize from './src/config/db.js';

async function patchDemoCenterPrograms() {
  try {
    const center = await models.User.findOne({
      where: { email: 'demo-center@erp.com' },
      include: [{ model: models.Department, as: 'department' }]
    });

    if (!center) {
      console.log('Demo center not found');
      return;
    }

    const centerId = center.deptId;
    console.log(`Patching programs for centerId: ${centerId}`);

    const allPrograms = await models.Program.findAll();
    console.log(`Found ${allPrograms.length} programs`);

    let createdCount = 0;
    for (const program of allPrograms) {
      const [mapping, created] = await models.CenterProgram.findOrCreate({
        where: { centerId: centerId, programId: program.id },
        defaults: {
          subDeptId: program.subDeptId || 1,
          isActive: true
        }
      });
      if (created) createdCount++;
    }

    console.log(`Created ${createdCount} new program mappings for Demo Center`);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await sequelize.close();
  }
}

patchDemoCenterPrograms();
