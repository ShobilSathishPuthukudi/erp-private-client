import { models } from './src/models/index.js';
const { User, Leave, Notification } = models;

async function verify() {
  console.log('--- STARTING NOTIFICATION VERIFICATION ---');
  
  try {
    // 1. Setup test employee
    let employee = await User.findOne({ where: { role: 'employee' } });
    if (!employee) {
       console.log('Creating test employee...');
       employee = await User.create({
         uid: 'EMP-NOTIFY-TEST',
         name: 'Notification Tester',
         email: 'test-notify@erp.com',
         password: 'password123',
         role: 'employee',
         status: 'active'
       });
    }

    console.log(`Using employee: ${employee.uid} (${employee.name})`);

    // 2. Simulate the logic from portals.js
    const type = 'Sick Leave';
    console.log('Creating test leave request...');
    const leave = await Leave.create({
      employeeId: employee.uid,
      type,
      fromDate: '2026-04-01',
      toDate: '2026-04-02',
      reason: 'Verification Test',
      status: 'pending_step1'
    });

    console.log(`Leave created with ID: ${leave.id}. Triggering notifications...`);

    const hrUsers = await User.findAll({ where: { role: 'hr' } });
    console.log(`Found ${hrUsers.length} HR users to notify.`);

    const employeeName = employee.name || employee.uid;
    let createdCount = 0;

    for (const hr of hrUsers) {
      await Notification.create({
        userUid: hr.uid,
        type: 'info',
        message: `New ${type} request submitted by ${employeeName}`,
        link: '/dashboard/hr/leaves'
      });
      createdCount++;
      console.log(`Notification created for ${hr.uid}`);
    }

    console.log(`--- VERIFICATION COMPLETE: ${createdCount} notifications created ---`);
    
    // Cleanup test data
    await leave.destroy();
    // Keep notification for manual check or delete it if preferred.
    console.log('Test leave deleted. Notification remains for verification.');

  } catch (error) {
    console.error('Verification failed:', error);
  } finally {
    process.exit();
  }
}

verify();
