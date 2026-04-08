import { models } from './src/models/index.js';

const { Student, Program, Department, User, Payment, IncentiveRule, Target } = models;

async function seed() {
  console.log('--- Institutional Seeding Engine (Harden V3) ---');
  try {
    // 1. Center
    await Department.findOrCreate({
      where: { id: 1 },
      defaults: { name: 'Test Center', type: 'partner-center', status: 'active', auditStatus: 'approved' }
    });

    // 2. Program
    await Program.findOrCreate({
      where: { id: 1 },
      defaults: { name: 'Test Program', shortName: 'TP', type: 'Skill', universityId: 1, subDeptId: 10 }
    });

    // 3. User (BDE + Admin fallback)
    await User.findOrCreate({
      where: { uid: 'SAL-ADM-001' },
      defaults: { name: 'Sales Admin', role: 'Sales & CRM Admin', email: 'sales@erp.com', password: 'password123', status: 'active' }
    });
    
    await User.findOrCreate({
      where: { uid: 'ORG-ADM-001' },
      defaults: { name: 'System Admin', role: 'Organization Admin', email: 'admin@erp.com', password: 'password123', status: 'active' }
    });

    // 4. Target (ID 0 for global rules)
    await Target.findOrCreate({
      where: { id: 0 },
      defaults: { 
        targetableType: 'department', 
        targetableId: '1', 
        metric: 'revenue', 
        value: 0, 
        startDate: new Date(), 
        endDate: new Date('2030-12-31'), 
        assignedBy: 'ORG-ADM-001', 
        status: 'active' 
      }
    });

    // 5. Student
    await Student.findOrCreate({
      where: { id: 1 },
      defaults: { 
        name: 'Test Student', 
        email: 'test@student.com', 
        deptId: 1, 
        centerId: 1, 
        programId: 1, 
        status: 'ENROLLED', 
        enrollStatus: 'enrolled', 
        feeStatus: 'PAID', 
        pendingAmount: 0, 
        paidAmount: 10000, 
        currentSemester: 1, 
        lmsStatus: 'pending', 
        reregStage: 0,
        bdeId: 'SAL-ADM-001'
      }
    });

    // 6. Incentive Rule
    await IncentiveRule.findOrCreate({
      where: { targetId: 0 },
      defaults: { 
        structure: [{ achievement: 1000, reward: 50 }, { achievement: 5000, reward: 250 }], 
        type: 'flat', 
        isActive: true 
      }
    });

    // 7. Payment
    await Payment.findOrCreate({
      where: { id: 1 },
      defaults: { studentId: 1, amount: 5000, mode: 'Online', status: 'verified', date: new Date() }
    });

    console.log('✅ Seeding Complete.');
  } catch (error) {
    console.error('❌ Seeding Failure:', error.message);
  }
  process.exit();
}

seed();
