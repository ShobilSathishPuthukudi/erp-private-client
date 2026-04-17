import { models } from './src/models/index.js';
import { Op } from 'sequelize';
import { getDepartmentNameAliases, getSubDepartmentNameAliases, normalizeDepartmentName, normalizeSubDepartmentName } from './src/config/institutionalStructure.js';

async function seedHierarchy() {
  const { Department, Role, User } = models;

  console.log('--- Institutional Hierarchy Migration Initiated ---');

  // 1. Unify Academic Operations Pillar without renaming existing rows.
  console.log('Resolving Academic Operations pillar aliases...');
  const academicOperationsAliases = getDepartmentNameAliases('Academic Operations');
  const opsDept = await Department.findOne({
    where: { name: { [Op.in]: academicOperationsAliases } },
    order: [['id', 'ASC']],
  }) || await Department.create({
    name: normalizeDepartmentName('Academic Operations'),
    type: 'departments',
    status: 'active'
  });

  // 2. Scale Core & Sub-Department lookup aliases without renaming persisted data.
  const standardDepts = [
    { name: 'Finance', isSubDepartment: false },
    { name: 'HR', isSubDepartment: false },
    { name: 'Sales', isSubDepartment: false },
    { name: 'Admissions', isSubDepartment: false },
    { name: 'BVoc', isSubDepartment: true },
    { name: 'Online', isSubDepartment: true },
    { name: 'Skill', isSubDepartment: true },
    { name: 'Open School', isSubDepartment: true }
  ];

  for (const sd of standardDepts) {
    const aliases = sd.isSubDepartment ? getSubDepartmentNameAliases(sd.name) : getDepartmentNameAliases(sd.name);
    const canonicalName = sd.isSubDepartment ? normalizeSubDepartmentName(sd.name) : normalizeDepartmentName(sd.name);
    const existing = await Department.findOne({
      where: { name: { [Op.in]: aliases } },
      order: [['id', 'ASC']],
    });

    if (!existing) {
      await Department.create({
        name: canonicalName,
        type: sd.isSubDepartment ? 'sub-departments' : 'departments',
        parentId: sd.isSubDepartment ? opsDept.id : null,
        status: 'active',
      });
    }
  }

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
