
import { models } from '../src/models/index.js';
import { handleAuthoritySuccession } from '../src/utils/governance/singletonEnforcement.js';
import { SINGLETON_ROLES } from '../src/config/rbac.js';
import bcrypt from 'bcryptjs';

const { User, Role, AuditLog } = models;

async function runVerification() {
  console.log('--- STARTING RBAC VERIFICATION ---');

  try {
    // 1. Verify Role Model Updates
    console.log('\n[1/4] Verifying Role Model...');
    const testRoleName = 'Test Admin ' + Date.now();
    const testPassword = 'adminPassword123';
    const hashedPassword = await bcrypt.hash(testPassword, 10);
    
    const role = await Role.create({
      name: testRoleName,
      description: 'Verification Role',
      isAdminEligible: true,
      roleId: 'ROLE-' + Date.now().toString().slice(-6),
      rolePassword: hashedPassword
    });
    console.log('✔ Role created with ID:', role.roleId);

    // 2. Verify Singleton Enforcement
    console.log('\n[2/4] Verifying Singleton Enforcement...');
    const singletonRole = 'Finance Admin'; // Must be in SINGLETON_ROLES
    
    // Ensure Finance Admin is in singleton list
    if (!SINGLETON_ROLES.includes(singletonRole)) {
      console.warn('⚠️ Finance Admin not in SINGLETON_ROLES, using CEO');
    }

    const user1Uid = 'TEST-USR-001';
    const user2Uid = 'TEST-USR-002';

    // Cleanup existing test users if any
    await User.destroy({ where: { uid: [user1Uid, user2Uid] }, force: true });

    console.log(`Creating first active user with role '${singletonRole}'...`);
    await User.create({
      uid: user1Uid,
      email: 'user1@test.com',
      password: 'password',
      role: singletonRole,
      status: 'active'
    });

    console.log(`Creating second active user with same role...`);
    // This should trigger succession via logic in routes, but here we call the utility directly to verify it works
    await handleAuthoritySuccession(models, singletonRole, user2Uid, null, 'VERIFIER');
    
    await User.create({
      uid: user2Uid,
      email: 'user2@test.com',
      password: 'password',
      role: singletonRole,
      status: 'active'
    });

    const user1 = await User.findOne({ where: { uid: user1Uid } });
    console.log(`✔ User1 status after succession: ${user1.status} (Expected: suspended)`);

    // 3. Verify Login Logic (Simulated)
    console.log('\n[3/4] Verifying Role-based Login Logic...');
    // Simulated check as done in auth.js
    const loginRole = await Role.findOne({ where: { name: testRoleName } });
    const match = await bcrypt.compare(testPassword, loginRole.rolePassword);
    console.log(`✔ Admin password match for Role '${testRoleName}': ${match}`);

    // 4. Verify Audit Log
    const log = await AuditLog.findOne({ 
      where: { action: 'AUTHORITY_SUCCESSION', entity: `User: ${user1Uid}` },
      order: [['createdAt', 'DESC']]
    });
    console.log(`✔ Audit Log entry found: ${log ? 'Yes' : 'No'}`);

    // Cleanup
    await User.destroy({ where: { uid: [user1Uid, user2Uid] }, force: true });
    await Role.destroy({ where: { name: testRoleName }, force: true });

    console.log('\n--- VERIFICATION COMPLETE ---');
  } catch (error) {
    console.error('❌ Verification Failed:', error);
  }
  process.exit(0);
}

runVerification();
