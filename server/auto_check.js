import { models } from './src/models/index.js';

const { Student, Program, Department, User, Payment, IncentiveRule, Target, ReregRequest, Attendance } = models;

async function seedAndVerify() {
  console.log('--- Institutional Flow: Unified Seeder & Verifier (Harden V5) ---');
  try {
    const HASH = '$2b$10$n268duoT.wTOIUT/67IaQe7r1CfkXEyXwzn3o6PUl0e6PYlRVbw32'; // Hash for 'password123'

    // 1. Force Sync Auth (Upsert to ensure known credentials)
    const authUsers = [
      { uid: 'ORG-ADM-001', email: 'admin@erp.com', role: 'Organization Admin', name: 'Admin' },
      { uid: 'SAL-ADM-001', email: 'sales@erp.com', role: 'Sales & CRM Admin', name: 'Sales' },
      { uid: 'HR-ADM-001', email: 'hr@erp.com', role: 'HR Admin', name: 'HR' },
      { uid: 'FIN-ADM-001', email: 'finance@erp.com', role: 'Finance Admin', name: 'Finance' }
    ];

    for (const u of authUsers) {
      const [user, created] = await User.findOrCreate({ 
        where: { uid: u.uid }, 
        defaults: { ...u, password: HASH, status: 'active' } 
      });
      if (!created) {
        await user.update({ password: HASH, status: 'active', email: u.email, role: u.role });
      }
    }

    await Department.findOrCreate({ where: { id: 1 }, defaults: { name: 'Test Center', type: 'partner-center', status: 'active', auditStatus: 'approved' }});
    await Program.findOrCreate({ where: { id: 1 }, defaults: { name: 'Test Program', shortName: 'TP', type: 'Skill', universityId: 1, subDeptId: 10 }});

    // 2. Targets & Rules (Linked to User to satisfy FK users.uid)
    const [target, tCreated] = await Target.findOrCreate({
      where: { id: 1 },
      defaults: { 
        targetableType: 'user', 
        targetableId: 'SAL-ADM-001', 
        metric: 'revenue', 
        value: 1000000, 
        startDate: new Date(), 
        endDate: new Date('2030-12-31'), 
        assignedBy: 'ORG-ADM-001', 
        status: 'active' 
      }
    });
    if (!tCreated) {
        await target.update({ value: 1000000, status: 'active', targetableId: 'SAL-ADM-001' });
    }
    
    await IncentiveRule.findOrCreate({
      where: { targetId: 1 }, 
      defaults: { structure: [{ achievement: 0, reward: 100 }], type: 'flat', isActive: true }
    });

    // 3. Student & Payment
    await Student.findOrCreate({
      where: { id: 1 },
      defaults: { name: 'Test Student', email: 't@s.com', deptId: 1, centerId: 1, programId: 1, status: 'ENROLLED', enrollStatus: 'enrolled', feeStatus: 'PAID', currentSemester: 1, bdeId: 'SAL-ADM-001' }
    });

    await Payment.findOrCreate({ where: { id: 1 }, defaults: { studentId: 1, amount: 5000, mode: 'Online', status: 'verified', date: new Date() }});

    console.log('✅ Baseline Data Ready.');

    // 4. API VERIFICATION
    const BASE_URL = 'http://localhost:3000/api';
    const login = async (e, p) => {
      const r = await fetch(`${BASE_URL}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: e, password: p }) });
      const data = await r.json();
      if (!r.ok) {
        console.error(`❌ LOGIN FAILURE for ${e}: ${data.error}`);
        return null;
      }
      return data.token;
    };

    const adminToken = await login('admin@erp.com', 'password123');
    const hrToken = await login('hr@erp.com', 'password123');
    const financeToken = await login('finance@erp.com', 'password123');

    if (!adminToken || !hrToken || !financeToken) {
       console.error('Unified Auth Token Acquisition Failed. Aborting flow checks.');
       process.exit(1);
    }

    console.log('\n--- Running Flow Checks ---');

    const test = async (m, u, t, b) => {
      const r = await fetch(`${BASE_URL}/${u}`, { method: m, headers: { 'Authorization': `Bearer ${t}`, 'Content-Type': 'application/json' }, body: b ? JSON.stringify(b) : null });
      const data = await r.json();
      console.log(`${r.ok ? '✅' : '❌'} [${m}] ${u} -> ${r.status}${!r.ok ? ': ' + JSON.stringify(data) : ''}`);
    };

    // Clean up volatile records
    await Attendance.destroy({ where: { userId: 'HR-ADM-001' } });
    await ReregRequest.destroy({ where: { studentId: 1 } });
    await Student.update({ reregStatus: 'none', reregStage: 0 }, { where: { id: 1 } });

    await test('POST', 'hr/attendance/clock-in', hrToken, { status: 'present' });
    await test('POST', 'hr/referrals/submit', hrToken, { name: 'Ref', phone: '123' });
    await test('POST', 'academic/students/1/lms-sync', adminToken);
    await test('POST', 'academic/students/1/rereg-request', adminToken, { remarks: 'Test' });
    await test('PUT', 'finance/students/1/adjust-fee', financeToken, { adjustmentAmount: 10, type: 'discount', remarks: 'Verification' });
    await test('POST', 'finance/incentives/calculate', financeToken, { period: new Date().toISOString().slice(0, 7), bdeId: 'SAL-ADM-001' });
    await test('POST', 'finance/payments/1/distribute', financeToken);

    console.log('\n--- Institutional Auto-Check Complete ---');
  } catch (error) {
    console.error('🔥 CRITICAL FAILURE:', error);
  }
  process.exit();
}

seedAndVerify();
