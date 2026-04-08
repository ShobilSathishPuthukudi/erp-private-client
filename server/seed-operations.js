import { models, sequelize } from './src/models/index.js';
const { Department, Student, Program, ProgramOffering } = models;

async function seedOperations() {
  try {
    await sequelize.authenticate();
    console.log('Database connected for operations seeding...');

    // 1. Create Regional Centers
    const centers = [
      { name: 'Delhi Regional Hub', type: 'center', auditStatus: 'approved', status: 'active', infrastructureDetails: { area: '5000 sqft', labs: 3, capacity: 500 } },
      { name: 'Mumbai Excellence Center', type: 'center', auditStatus: 'approved', status: 'active', infrastructureDetails: { area: '4500 sqft', labs: 4, capacity: 400 } },
      { name: 'Bangalore Skill Campus', type: 'center', auditStatus: 'pending', status: 'inactive', infrastructureDetails: { area: '6000 sqft', labs: 5, capacity: 600 } },
      { name: 'Chennai Academic Node', type: 'center', auditStatus: 'pending', status: 'inactive', infrastructureDetails: { area: '3000 sqft', labs: 2, capacity: 300 } },
      { name: 'Kolkata Training Wing', type: 'center', auditStatus: 'rejected', status: 'inactive', rejectionReason: 'Insufficient lab infrastructure' }
    ];

    for (const c of centers) {
      await Department.findOrCreate({
        where: { name: c.name },
        defaults: c
      });
    }
    console.log('Centers seeded.');

    // 2. Fetch some existing programs
    const programs = await Program.findAll({ limit: 3 });
    const centerList = await Department.findAll({ where: { type: 'center', auditStatus: 'approved' } });

    if (programs.length > 0 && centerList.length > 0) {
      // Find a university for deptId
      const university = await Department.findOne({ where: { type: 'university' } });
      const deptId = university ? university.id : null;

      // 3. Create Program Offerings
      for (const p of programs) {
        for (const c of centerList) {
          await ProgramOffering.findOrCreate({
            where: { programId: p.id, centerId: c.id },
            defaults: { programId: p.id, centerId: c.id }
          });
        }
      }
      console.log('Program offerings linked.');

      // 4. Seed Student Distribution for Performance Stats
      const studentNames = ['Aditi Sharma', 'Rahul Varma', 'Priya Mani', 'Amit Patel', 'Sneha Reddy'];
      for (let i = 0; i < 20; i++) {
        const randomCenter = centerList[i % centerList.length];
        const randomProgram = programs[i % programs.length];
        
        await Student.create({
          name: `${studentNames[i % 5]} ${i}`,
          email: `student.ops.${i}@example.com`,
          deptId: deptId, // Mandatory
          programId: randomProgram.id,
          centerId: randomCenter.id,
          enrollStatus: 'active',
          attemptCount: 1,
          admissionBatch: '2026-A'
        });
      }
      console.log('Student distribution seeded for performance analytics.');
    }

    console.log('Operations seeding completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seedOperations();
