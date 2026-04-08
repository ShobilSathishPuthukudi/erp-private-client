import { models } from './src/models/index.js';

async function seed() {
  try {
    const students = [
      {
        name: 'Aiden Smith',
        email: 'aiden.smith@dummy.com',
        phone: '98765001',
        status: 'PENDING_REVIEW',
        enrollStatus: 'pending_subdept',
        deptId: 43,
        centerId: 43,
        programId: 1,
        subDepartmentId: 9,
        reviewStage: 'SUB_DEPT'
      },
      {
        name: 'Bella Jones',
        email: 'bella.jones@dummy.com',
        phone: '98765002',
        status: 'FINANCE_PENDING',
        enrollStatus: 'pending_finance',
        deptId: 43,
        centerId: 43,
        programId: 1,
        subDepartmentId: 9,
        reviewStage: 'FINANCE'
      },
      {
        name: 'Charlie Brown',
        email: 'charlie.brown@dummy.com',
        phone: '98765003',
        status: 'ENROLLED',
        enrollStatus: 'active',
        deptId: 43,
        centerId: 43,
        programId: 1,
        subDepartmentId: 9,
        reviewStage: 'FINANCE' // Final stage in logic
      }
    ];

    for (const s of students) {
      await models.Student.create(s);
      console.log(`Created dummy student: ${s.name} (${s.status})`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Seeding Error:', error);
    process.exit(1);
  }
}

seed();
