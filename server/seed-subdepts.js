import { models } from './src/models/index.js';
import { Op } from 'sequelize';
import { getSubDepartmentNameAliases, normalizeSubDepartmentName } from './src/config/institutionalStructure.js';

async function seedSubDepts() {
  const { Department, User, Program, Student } = models;

  const subDepts = [
    { name: 'Open School', role: 'openschool', adminUid: 'OS-001' },
    { name: 'Online', role: 'online', adminUid: 'ON-001' },
    { name: 'Skill', role: 'skill', adminUid: 'SK-001' },
    { name: 'BVoc', role: 'bvoc', adminUid: 'BV-001' }
  ];

  for (const sd of subDepts) {
    const canonicalName = normalizeSubDepartmentName(sd.name);
    console.log(`Processing ${canonicalName}...`);
    
    // Reuse a matching legacy row if it already exists so reruns do not create replicas.
    const existingDepartment = await Department.findOne({
      where: { name: { [Op.in]: getSubDepartmentNameAliases(canonicalName) } },
      order: [['id', 'ASC']],
    });
    const created = !existingDepartment;
    const dept = existingDepartment || await Department.create({
      name: canonicalName,
      status: 'active',
      type: 'sub-departments',
    });

    console.log(`${canonicalName} Department ID: ${dept.id} (Created: ${created})`);

    // 2. Link Admin User
    const user = await User.findOne({ where: { uid: sd.adminUid } });
    if (user) {
      await user.update({ deptId: dept.id });
      // Bi-directional link for Organization Dashboard / Governance HUD
      await dept.update({ adminId: user.uid });
      console.log(`Linked ${sd.adminUid} to Dept ${dept.id} (Bi-directional)`);
    } else {
      console.log(`User ${sd.adminUid} NOT FOUND!`);
    }

    // 3. Link Programs of that type
    // In Program model, we have 'type' which might match the role or be similar
    const programType = sd.role === 'openschool' ? 'OpenSchool' : 
                        sd.role === 'online' ? 'Online' :
                        sd.role === 'skill' ? 'Skill' : 'BVoc';

    const [count] = await Program.update(
      { subDeptId: dept.id },
      { where: { type: programType } }
    );
    console.log(`Updated ${count} programs of type ${programType} with subDeptId ${dept.id}`);
    
    // 4. Link Students in those programs
    // Students don't have subDeptId directly, but we can update their records if needed
    // Actually, Student.findAll includes Program.subDeptId, so updating Program is enough.
  }

  process.exit(0);
}

seedSubDepts().catch(err => {
  console.error(err);
  process.exit(1);
});
