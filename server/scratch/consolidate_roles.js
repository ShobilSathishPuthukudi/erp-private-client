import Role from '../src/models/Role.js';
import User from '../src/models/User.js';
import sequelize from '../src/config/db.js';
import { Op } from 'sequelize';

async function consolidateRoles() {
  const transaction = await sequelize.transaction();
  try {
    console.log('🚀 Starting Institutional Role Consolidation...');

    const migrationMap = {
      'Sales & CRM Admin': 'Sales Admin',
      'Skill Department Admin': 'Skill Admin',
      'Online Department Admin': 'Online Admin',
      'BVoc Department Admin': 'BVoc Admin',
    };

    const purgeIds = [18, 20, 21, 22, 72, 73];

    // 1. Migrate Users to Standardized Role Names
    console.log('👥 Migrating personnel to standardized roles...');
    for (const [oldName, newName] of Object.entries(migrationMap)) {
      const [count] = await User.update(
        { role: newName },
        { where: { role: oldName }, transaction }
      );
      if (count > 0) console.log(`   - Moved ${count} users from '${oldName}' to '${newName}'`);
    }

    // 2. Purge Redundant/Test Roles
    console.log('🧹 Purging redundant role records...');
    const deletedCount = await Role.destroy({
      where: { id: { [Op.in]: purgeIds } },
      transaction
    });
    console.log(`   - Successfully removed ${deletedCount} redundant roles.`);

    await transaction.commit();
    console.log('✨ Role consolidation complete! Institutional registry now contains 13 standardized roles.');

  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error('❌ Role consolidation failed!', error);
  } finally {
    process.exit();
  }
}

consolidateRoles();
