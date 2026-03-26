import { models } from './src/models/index.js';

async function seedEligibility() {
  const { Student, Program } = models;

  const demoStudents = [
    {
      name: 'John Doe',
      deptId: 8,
      programId: 2, // High School Certificate
      enrollStatus: 'pending_eligibility',
      feeStatus: 'unpaid',
      marks: { tenth: 85, twelfth: 88 },
      documents: [
        { name: '10th Marksheet', path: '/uploads/documents/dummy-marksheet.pdf' },
        { name: 'ID Proof', path: '/uploads/documents/dummy-id.jpg' }
      ]
    },
    {
      name: 'Jane Smith',
      deptId: 8,
      programId: 2,
      enrollStatus: 'pending_eligibility',
      feeStatus: 'unpaid',
      marks: { tenth: 92, twelfth: 90 },
      documents: [
        { name: '10th Marksheet', path: '/uploads/documents/dummy-marksheet.pdf' }
      ]
    },
    {
      name: 'Robert Brown',
      deptId: 9,
      programId: 1, // Demo Progrm
      enrollStatus: 'pending_eligibility',
      feeStatus: 'unpaid',
      marks: { tenth: 78, twelfth: 82 },
      documents: [
        { name: '12th Marksheet', path: '/uploads/documents/dummy-marksheet.pdf' }
      ]
    },
    {
      name: 'Emily Davis',
      deptId: 9,
      programId: 1,
      enrollStatus: 'pending_eligibility',
      feeStatus: 'unpaid',
      marks: { tenth: 88, twelfth: 85 },
      documents: [
        { name: 'Admission Essay', path: '/uploads/documents/dummy-marksheet.pdf' }
      ]
    },
    {
      name: 'Michael Wilson',
      deptId: 8,
      programId: 2,
      enrollStatus: 'pending',
      feeStatus: 'unpaid',
      marks: { tenth: 75, twelfth: 78 },
      createdAt: new Date().toISOString(),
      documents: [
        { name: 'Consolidated Marksheet', path: '/uploads/documents/dummy-marksheet.pdf' }
      ]
    },
    {
      name: 'Sarah Miller',
      deptId: 8,
      programId: 2,
      enrollStatus: 'pending',
      feeStatus: 'unpaid',
      marks: { tenth: 88, twelfth: 92 },
      createdAt: new Date().toISOString(),
      documents: [
        { name: 'Institutional Certificate', path: '/uploads/documents/dummy-marksheet.pdf' }
      ]
    },
    {
      name: 'David Taylor',
      deptId: 9,
      programId: 1,
      enrollStatus: 'pending',
      feeStatus: 'unpaid',
      marks: { tenth: 82, twelfth: 80 },
      createdAt: new Date().toISOString(),
      documents: [
        { name: 'Transfer Certificate', path: '/uploads/documents/dummy-marksheet.pdf' }
      ]
    },
    {
      name: 'Jessica Moore',
      deptId: 9,
      programId: 1,
      enrollStatus: 'pending',
      feeStatus: 'unpaid',
      marks: { tenth: 95, twelfth: 98 },
      createdAt: new Date().toISOString(),
      documents: [
        { name: 'Scholastic Record', path: '/uploads/documents/dummy-marksheet.pdf' }
      ]
    }
  ];

  console.log('🌱 Seeding Academic Eligibility Queue...');

  try {
    for (const stu of demoStudents) {
      const student = await Student.findOne({
        where: { name: stu.name, programId: stu.programId }
      });
      
      if (student) {
        await student.update(stu);
        console.log(`✅ Updated student: ${stu.name}`);
      } else {
        await Student.create(stu);
        console.log(`✅ Created student: ${stu.name}`);
      }
    }
    console.log('✨ Eligibility seeding complete!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    process.exit(0);
  }
}

seedEligibility();
