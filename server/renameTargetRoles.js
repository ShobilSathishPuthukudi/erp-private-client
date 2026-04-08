import { sequelize, models } from './src/models/index.js';
import dotenv from 'dotenv';
dotenv.config();

const { Role, User, Permission } = models;

const mapping = {
  'finance': 'Finance Administrator',
  'hr': 'HR Administrator',
  'operations': 'Operations Administrator',
  'academic': 'Academic Administrator',
  'sales': 'Sales & CRM Administrator',
  'skill': 'Skill Department Admin',
  'bvoc': 'BVoc Department Admin',
  'openschool': 'Open School Admin',
  'online': 'Online Department Admin'
};

async function migrate() {
  console.log('--- PROFESSIONAL ROLE TRANSITION ---');
  let transaction;

  try {
    await sequelize.authenticate();
    transaction = await sequelize.transaction();

    // Disable FK checks if necessary, or just rely on CASCADE
    // await sequelize.query('SET FOREIGN_KEY_CHECKS = 0', { transaction });

    for (const [oldSlug, newTitle] of Object.entries(mapping)) {
      console.log(`\n[TRANSITION] Processing: '${oldSlug}' -> '${newTitle}'`);

      // 1. Check if the role exists
      const role = await Role.findOne({ where: { name: oldSlug }, transaction });
      
      if (role) {
        // 2. Update the Role name (This should CASCADE if DB is configured correctly)
        // But safe approach: Update Permissions and Users manually if CASCADE isn't reliable
        
        console.log(`   - Updating Role registry...`);
        await role.update({ name: newTitle, isCustom: false, isAdminEligible: true }, { transaction });

        // 3. Manually sync Users and Permissions just in case CASCADE isn't set or triggered
        console.log(`   - Synchronizing Users...`);
        await User.update({ role: newTitle }, { where: { role: oldSlug }, transaction });
        
        console.log(`   - Synchronizing Permissions...`);
        await Permission.update({ role: newTitle }, { where: { role: oldSlug }, transaction });

      } else {
        // Check if it already exists as the new title
        const exists = await Role.findOne({ where: { name: newTitle }, transaction });
        if (!exists) {
          console.log(`   - Creating new entry for '${newTitle}'.`);
          await Role.create({ name: newTitle, isCustom: false, isAdminEligible: true }, { transaction });
        } else {
          console.log(`   - Role '${newTitle}' already exists.`);
        }
      }
    }

    // await sequelize.query('SET FOREIGN_KEY_CHECKS = 1', { transaction });
    await transaction.commit();
    console.log('\n✅ TRANSITION COMPLETE.');
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error('\n❌ CRITICAL FAILURE:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

migrate();
