import { models, sequelize } from '../src/models/index.js';
import { Op } from 'sequelize';
const { Student, Program, Department, CenterSubDept } = models;

async function seedActualData() {
  try {
    await sequelize.authenticate();
    console.log('🌱 Starting Actual Data Seeding...');

    // 1. Find or Create University
    const [univ] = await Department.findOrCreate({
      where: { name: "IITS RPS" },
      defaults: { type: "university", status: "active" }
    });
    const uId = univ.id;
    console.log(`🏛️ University ID: ${uId}`);

    // Update all programs to this university just in case
    await Program.update({ universityId: uId }, { where: {} });

    // 2. Create a Test Center
    const [center] = await Department.findOrCreate({
      where: { name: "IITS Global Campus", type: "center" },
      defaults: {
        type: "center",
        status: "active",
        auditStatus: "approved",
        infrastructureDetails: { capacity: 1000 }
      }
    });
    const cId = center.id;
    console.log(`📍 Center ID: ${cId}`);

    // 3. Map Center to all 4 Sub-Depts
    const subDeptKeys = ['openschool', 'online', 'skill', 'bvoc'];
    for (const key of subDeptKeys) {
      await CenterSubDept.findOrCreate({
        where: { centerId: cId, subDeptName: key },
        defaults: { centerId: cId, subDeptName: key }
      });
    }
    console.log('🗺️ Center mapped to all sub-departments.');

    // 4. Ensure each Sub-Dept has a program
    const subDeptIds = [8, 9, 10, 11];
    const subDeptNames = ['Open School', 'Online', 'Skill', 'BVoc'];
    const pTypes = ['OpenSchool', 'Online', 'Skill', 'BVoc'];

    for (let i = 0; i < 4; i++) {
        await Program.findOrCreate({
          where: { subDeptId: subDeptIds[i], type: pTypes[i] },
          defaults: {
            name: `${subDeptNames[i]} Program Alpha`,
            shortName: `${pTypes[i]}-A`,
            duration: 1,
            universityId: uId,
            subDeptId: subDeptIds[i],
            type: pTypes[i],
            status: 'active'
          }
        });
    }
    console.log('📚 Programs ensured for all units.');

    // 5. Fetch all relevant programs
    const programs = await Program.findAll({
      where: { subDeptId: subDeptIds }
    });

    // 6. Seed 20 students
    const names = [
      'Aarav Patel', 'Ishaan Gupta', 'Zoya Khan', 'Advait Singh', 'Ananya Desai',
      'Kabir Sharma', 'Vihaan Varma', 'Myra Reddy', 'Arjun Joshi', 'Saanvi Nair',
      'Reyansh Malhotra', 'Diya Iyer', 'Vivaan Rao', 'Ahana Bose', 'Aaryan Das',
      'Kaira Roy', 'Dhruv Hegde', 'Kyra Pillai', 'Atharv Kulkarni', 'Shanaya Sen'
    ];

    for (let i = 0; i < 20; i++) {
        const subDeptId = subDeptIds[i % 4];
        const subDeptPrograms = programs.filter(p => p.subDeptId === subDeptId);
        const program = subDeptPrograms[i % subDeptPrograms.length];

        await Student.findOrCreate({
          where: { email: `stu.actual.${i}@erp.com` },
          defaults: {
            uid: `STU-ACTUAL-${100 + i}`,
            name: names[i],
            email: `stu.actual.${i}@erp.com`,
            deptId: uId,
            programId: program.id,
            centerId: cId,
            subDepartmentId: subDeptId,
            enrollStatus: 'active',
            status: 'ENROLLED',
            admissionBatch: '2026-A'
          }
        });
    }

    console.log('✅ Seeded 20 actual students across 4 sub-departments.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seedActualData();
