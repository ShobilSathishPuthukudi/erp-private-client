import { models, sequelize } from './src/models/index.js';
import bcrypt from 'bcryptjs';

const { Department, User } = models;

async function testUpdate() {
  const deptId = 3;
  const adminName = "Test New Admin";
  const adminEmail = `test-admin-${Date.now()}@ams.com`;
  const adminPassword = "password123";

  console.log(`--- Testing Admin Creation for Dept ${deptId} ---`);
  
  const dept = await Department.findByPk(deptId);
  if (!dept) throw new Error("Dept not found");

  const oldAdminId = dept.adminId;
  console.log(`Current Admin: ${oldAdminId}`);

  // 1. Simulate the route logic for creating user
  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  const generatedUid = `OPS-${Date.now().toString().slice(-6)}`;
  
  const newUser = await User.create({
    uid: generatedUid,
    email: adminEmail,
    password: hashedPassword,
    devPassword: adminPassword,
    role: 'operations',
    name: adminName,
    status: 'active',
    deptId: dept.id
  });
  console.log(`New User Created: ${newUser.uid}`);

  // 2. Update Dept
  await dept.update({ adminId: newUser.uid });
  console.log(`Department updated with adminId: ${newUser.uid}`);

  // 3. Sync Logic (Verify Bi-directional)
  if (oldAdminId) {
    const [cleared] = await User.update({ deptId: null }, { where: { uid: oldAdminId, deptId: dept.id } });
    console.log(`Cleared old admin links: ${cleared}`);
  }
  
  // Verify linkage
  const updatedDept = await Department.findByPk(deptId, {
    include: [{ model: User, as: 'admin' }]
  });
  
  console.log(`Final Verification:`);
  console.log(`Dept Admin Name: ${updatedDept.admin?.name}`);
  console.log(`User Dept ID Check: ${newUser.deptId === deptId ? "PASS" : "FAIL"}`);

  // Cleanup: rollback or delete? Let's just keep it for now as a real test.
}

testUpdate().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
