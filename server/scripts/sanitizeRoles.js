import { sequelize, models } from '../src/models/index.js';

const { Role, User } = models;

async function sanitizeRoles() {
  console.log('--- INSTITUTIONAL ROLE REGISTRY SANITIZATION ---');
  
  try {
    await sequelize.authenticate();
    console.log('[DATABASE] Engine authenticated.');

    const allRoles = await Role.findAll();
    console.log(`[AUDIT] Found ${allRoles.length} total role entries.`);

    const canonicalMapping = {}; // name.toLowerCase() -> canonicalRoleObject
    const duplicates = [];

    // Identified leadership roles for eligibility hardening
    const eligibleRoles = [
      'Organization Admin', 
      'system-admin', 
      'ceo', 
      'dept-admin', 
      'Academic Admin', 
      'Finance Admin', 
      'Operations Admin', 
      'HR Admin',
      'Sales & CRM Admin',
      'Skill Department Admin',
      'BVoc Department Admin',
      'Open School Admin',
      'Online Department Admin'
    ];

    // 1. Separate canonicals from duplicates (Case-insensitive & Space-agnostic)
    allRoles.forEach(role => {
      const slugName = role.name.toLowerCase().replace(/\s+/g, '-');
      
      if (!canonicalMapping[slugName]) {
        canonicalMapping[slugName] = role;
      } else {
        const existing = canonicalMapping[slugName];
        // Prefer the one that is already exactly the slugName
        if (role.name === slugName) {
          duplicates.push(existing);
          canonicalMapping[slugName] = role;
        } else {
          duplicates.push(role);
        }
      }
    });

    console.log(`[AUDIT] Identified ${duplicates.length} duplicate identities for consolidation.`);

    const t = await sequelize.transaction();
    try {
      // 2. Consolidate Roles & Synchronize Users
      for (const duplicate of duplicates) {
        const slugName = duplicate.name.toLowerCase().replace(/\s+/g, '-');
        const canonical = canonicalMapping[slugName];
        
        if (duplicate.id === canonical.id) continue;

        console.log(`[MIGRATION] Consolidating '${duplicate.name}' (ID: ${duplicate.id}) -> '${canonical.name}' (ID: ${canonical.id})`);

        // Synchronize all personnel records
        const [updatedUsers] = await User.update(
          { role: canonical.name },
          { where: { role: duplicate.name }, transaction: t }
        );
        
        console.log(`[IDENTITY] Synchronized ${updatedUsers} personnel records.`);

        // Purge the duplicate from the registry
        await Role.destroy({ where: { id: duplicate.id }, transaction: t });
      }

      const remainingRoles = await Role.findAll({ transaction: t });
      for (const role of remainingRoles) {
        // [GOVERNANCE] Preserving professional titles (Spaces & Case are now intentional)
        const slugName = role.name; 
        
        // 4. Harden Administrative Eligibility
        if (eligibleRoles.includes(role.name) && !role.isAdminEligible) {
          console.log(`[GOVERNANCE] Raising eligibility status for role: '${role.name}'`);
          await role.update({ isAdminEligible: true }, { transaction: t });
        }
      }

      await t.commit();
      console.log('--- SANITIZATION COMPLETE ---');
    } catch (migrationError) {
      await t.rollback();
      throw migrationError;
    }

  } catch (error) {
    console.error('[CRITICAL FAILURE]:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

sanitizeRoles();
