import { models, sequelize } from './src/models/index.js';

async function consolidateDemoCenter() {
  const t = await sequelize.transaction();
  try {
    const targetDeptId = 71;
    const targetUid = 'CTR-693477';
    const legacyUid = 'DEMO ';

    console.log(`[CONSOLIDATION]: Starting identity merge for Center ID ${targetDeptId}...`);

    // 1. Update the Department record to point to the correct User identity
    const dept = await models.Department.findByPk(targetDeptId, { transaction: t });
    if (dept) {
      console.log(`[CONSOLIDATION]: Updating Department ${dept.name} (ShortName: ${dept.shortName})...`);
      await dept.update({
        adminId: targetUid,
        loginId: targetUid,
        shortName: 'DEMO' // Clean up the trailing space
      }, { transaction: t });
      console.log(`[CONSOLIDATION]: Department updated successfully.`);
    } else {
      console.warn(`[CONSOLIDATION]: Warning - Department ${targetDeptId} not found.`);
    }

    // 2. Identify and Purge the legacy User record
    const legacyUser = await models.User.findOne({ where: { uid: legacyUid }, transaction: t });
    if (legacyUser) {
      console.log(`[CONSOLIDATION]: Purging legacy User ${legacyUser.name} (${legacyUid})...`);
      await legacyUser.destroy({ transaction: t });
      console.log(`[CONSOLIDATION]: Legacy user purged successfully.`);
    } else {
      console.warn(`[CONSOLIDATION]: Warning - Legacy user ${legacyUid} not found.`);
    }

    // 3. Ensure the primary User CTR-693477 is correctly configured
    const primaryUser = await models.User.findOne({ where: { uid: targetUid }, transaction: t });
    if (primaryUser) {
        // Standardize the name to match the center
        await primaryUser.update({
            name: 'Demo center 10',
            deptId: targetDeptId,
            status: 'active'
        }, { transaction: t });
        console.log(`[CONSOLIDATION]: Primary user CTR-693477 verified and updated.`);
    } else {
        console.error(`[CONSOLIDATION]: CRITICAL ERROR - Primary user ${targetUid} missing from institutional ledger.`);
        throw new Error('Primary user record missing.');
    }

    await t.commit();
    console.log(`[CONSOLIDATION]: SUCCESS. Identities consolidated for "Demo center 10".`);
    process.exit(0);
  } catch (error) {
    await t.rollback();
    console.error(`[CONSOLIDATION]: FAILURE. Transaction rolled back.`, error);
    process.exit(1);
  }
}

consolidateDemoCenter();
