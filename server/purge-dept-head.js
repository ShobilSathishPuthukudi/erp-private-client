import { sequelize, models } from './src/models/index.js';
import { Op } from 'sequelize';

const { User, Department, Task, Leave, AuditLog, Notification } = models;

async function purge() {
  const transaction = await sequelize.transaction();
  try {
    console.log('--- PURGING DEFAULT DEPARTMENT HEAD ---');

    const targetUid = 'DEPT-ADMIN-001';
    const targetEmail = 'dept@erp.com';

    // 1. Find the target user precisely
    const user = await User.findOne({ 
      where: { 
        [Op.or]: [
          { uid: targetUid },
          { email: targetEmail }
        ]
      },
      transaction 
    });

    if (!user) {
      console.log('ℹ️ Targeted Department Head not found in database. Already clean?');
      await transaction.commit();
      process.exit(0);
    }

    console.log(`📍 Identified Target: ${user.name} (${user.uid})`);

    // 2. Structural Decoupling: Clear Department adminId references
    console.log('Clearing administrative associations in Departments...');
    await Department.update(
      { adminId: null },
      { where: { adminId: user.uid }, transaction }
    );

    // 3. Clear Workflow records (Tasks, Leaves, etc. assigned to/by them)
    console.log('Sanitizing operational workflow records...');
    await Task.destroy({
      where: {
        [Op.or]: [
          { assignedTo: user.uid },
          { assignedBy: user.uid }
        ]
      },
      transaction
    });

    await Leave.destroy({
      where: {
        [Op.or]: [
          { employeeId: user.uid },
          { step1By: user.uid },
          { step2By: user.uid }
        ]
      },
      transaction
    });

    // 4. Governance Audit Cleansing
    console.log('Wiping governance footprint (AuditLogs, Notifications)...');
    await AuditLog.destroy({ where: { userId: user.uid }, transaction });
    await Notification.destroy({ where: { userUid: user.uid }, transaction });

    // 5. Final Identity Revocation
    console.log(`Removing identity ${user.uid} from registry...`);
    await user.destroy({ transaction });

    await transaction.commit();
    console.log('--- PURGE SUCCESSFUL: DEFAULT HEAD REMOVED ---');
    process.exit(0);
  } catch (error) {
    await transaction.rollback();
    console.error('--- PURGE FAILED: TRANSACTION ABORTED ---');
    console.error(error);
    process.exit(1);
  }
}

purge();
