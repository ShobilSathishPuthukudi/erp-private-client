import { models, sequelize } from '../server/src/models/index.js';
const { Department, User, Lead } = models;
const { Op } = sequelize;

async function recover() {
  const t = await sequelize.transaction();
  try {
    console.log('--- Phase 1: Institutional Reconstruction ---');
    
    // 1. Create the missing Department record for Test center 001
    // Using a new ID to avoid conflicts with potential hidden records, 
    // though our scan confirmed only 8 exist.
    const newCenter = await Department.create({
      name: 'Test center 001',
      shortName: 'TC001',
      type: 'partner centers',
      status: 'active',
      auditStatus: 'approved',
      centerStatus: 'ACTIVE',
      description: 'Recovered verified partner center record.',
      createdAt: new Date(),
      updatedAt: new Date()
    }, { transaction: t });

    console.log(`Created Department: ${newCenter.name} (ID: ${newCenter.id})`);

    // 2. Re-link Users
    const usersToUpdate = await User.findAll({
      where: {
        role: 'Partner Center',
        name: 'Test center 001'
      }
    });

    console.log(`Found ${usersToUpdate.length} users to re-link.`);
    for (const user of usersToUpdate) {
      await user.update({ deptId: newCenter.id }, { transaction: t });
      console.log(`  -> Updated User ${user.uid} (Old Dept: ${user.deptId} -> New Dept: ${newCenter.id})`);
    }

    // 3. Update Lead Traceability
    const lead = await Lead.findOne({ where: { id: 28 } });
    if (lead) {
      await lead.update({ centerId: newCenter.id }, { transaction: t });
      console.log(`  -> Updated Lead 28 traceability (New Center ID: ${newCenter.id})`);
    }

    await t.commit();
    console.log('\n--- Recovery Completed Successfully ---');
    process.exit(0);
  } catch (err) {
    await t.rollback();
    console.error('Recovery Failed:', err);
    process.exit(1);
  }
}

recover();
