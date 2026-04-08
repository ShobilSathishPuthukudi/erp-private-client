import { models } from './src/models/index.js';

async function seedHierarchy() {
  const { Department, Role, User } = models;

  console.log('--- Institutional Hierarchy Migration Initiated ---');

  // 1. Unify Academic Operations Pillar
  console.log('Unifying Operations and Academics into Academic Operations Pillar...');
  
  // Find or create the primary Academic Operations Department
  const [opsDept, created] = await Department.findOrCreate({
    where: { type: 'Academic Operations' },
    defaults: { 
      name: 'Academic Operations Department', 
      type: 'Academic Operations',
      status: 'active'
    }
  });

  // 2. Scale Core & Sub-Department Nomenclature in Registry
  const standardDepts = [
    { type: 'Finance', name: 'Finance Department' },
    { type: 'HR', name: 'HR Department' },
    { type: 'Sales', name: 'Sales Department' },
    { type: 'Admissions', name: 'Admissions Department' },
    { type: 'bvoc', name: 'BVoc Department' },
    { type: 'online', name: 'Online Department' },
    { type: 'skill', name: 'Skill Department' },
    { type: 'openschool', name: 'Open School Department' }
  ];

  for (const sd of standardDepts) {
    await Department.update(
      { name: sd.name },
      { where: { type: sd.type } }
    );
  }

  // Handle existing 'Operations' or 'Academics' units by renaming them
  await Department.update(
    { name: 'Academic Operations Department', type: 'Academic Operations' },
    { where: { name: ['Operations', 'Academics', 'Operations Department'] } }
  );

  // 3. User & Role Registry Migration (GAP-5)
  // 3.1 Reassign Users to the Unified Role Set
  console.log('Reassigning users holding legacy roles...');
  await User.update(
    { role: 'Academic Operations Admin' },
    { where: { role: 'Operations Admin' } }
  );
  await User.update(
    { role: 'Partner Center' },
    { where: { role: ['study-center', 'center'] } }
  );

  // 3.2 Prune Legacy Roles from the Master Table
  console.log('Decommissioning legacy roles...');
  try {
    await Role.destroy({
      where: { name: ['Operations Admin', 'study-center', 'center', 'Academic Admin'] }
    });
  } catch (e) {
    console.warn('Note: Some roles could not be deleted due to remaining constraints. Manual audit required.');
  }

  // 4. Harden Verified Admin Status (14 Auth Roles)
  console.log('Hardening Verified Admin Status (Definitive 14)...');
  const eligibleRoleNames = [
    'Organization Admin', 
    'CEO', 
    'Finance Admin', 
    'HR Admin', 
    'Academic Operations Admin', 
    'Admissions Admin', 
    'Sales & CRM Admin',
    'BVoc Department Admin',
    'Skill Department Admin',
    'Open School Admin',
    'Online Department Admin'
  ];

  await Role.update(
    { isAdminEligible: true, isAudited: true },
    { where: { name: eligibleRoleNames } }
  );

  console.log('--- Macro-Institutional Hierarchy Realignment Complete ---');
  process.exit(0);
}

seedHierarchy().catch(err => {
  console.error('Migration Aborted:', err);
  process.exit(1);
});
