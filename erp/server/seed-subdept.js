import { models, sequelize } from './src/models/index.js';
import bcrypt from 'bcryptjs';

const { User, CenterSubDept, Department, Program } = models;

async function seedSubDeptInfrastructure() {
  try {
    await sequelize.authenticate();
    console.log('Database connected for sub-dept seeding...');

    const password = await bcrypt.hash('admin123', 10);
    const subDepts = ['OpenSchool', 'Online', 'Skill', 'BVoc'];

    // 1. Create Sub-Dept Admins
    for (const sd of subDepts) {
      await User.findOrCreate({
        where: { email: `${sd.toLowerCase()}@erp.com` },
        defaults: {
          uid: `admin-${sd.toLowerCase()}`,
          name: `${sd} Administrator`,
          email: `${sd.toLowerCase()}@erp.com`,
          password,
          role: 'SUB_DEPT_ADMIN',
          subDepartment: sd,
          status: 'active'
        }
      });
    }
    console.log('Sub-department admins seeded.');

    // 2. Map Centers to Sub-Depts (Many-to-Many)
    const centers = await Department.findAll({ where: { type: 'center' } });
    for (const center of centers) {
       // Randomly assign 1-2 sub-depts to each center
       const count = Math.floor(Math.random() * 2) + 1;
       const selected = subDepts.sort(() => 0.5 - Math.random()).slice(0, count);
       
       for (const sdName of selected) {
         await CenterSubDept.findOrCreate({
           where: { centerId: center.id, subDeptName: sdName },
           defaults: { centerId: center.id, subDeptName: sdName }
         });
       }
    }
    console.log('Center -> Sub-Dept mappings established.');

    // 3. Update Existing Programs with subDeptId and type
    const programs = await Program.findAll();
    for (let i = 0; i < programs.length; i++) {
        const sdName = subDepts[i % subDepts.length];
        await programs[i].update({
            subDeptId: (i % 4) + 1,
            type: sdName
        });
    }
    console.log('Programs updated with strict sub-dept ownership.');

    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seedSubDeptInfrastructure();
