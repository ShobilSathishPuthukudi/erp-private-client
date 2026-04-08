import { sequelize, models } from './src/models/index.js';
import { Op } from 'sequelize';

const { 
  User, 
  Department, 
  Task, 
  Lead, 
  Leave, 
  CEOPanel, 
  AuditLog, 
  Notification, 
  IncentivePayout, 
  Target,
  Quotation,
  LeadTouchpoint,
  Referral,
  CredentialRequest,
  AcademicActionRequest,
  Student
} = models;

const DUMMY_UIDS = [
  'center@erp.com',
  'CTR-ONB-9627-47',
  'DEP-646950',
  'EMP-160460', // archana (demo-employee)
  'EMP-223254',
  'EMP-267926',
  'EMP-DEMO-001',
  'EMP-DEMO-002',
  'OPS-583918',
  'SAL-ADM-001',
  'SALES-DEMO-001',
  'SALES-DEMO-002',
  'STU-001',
  'employee@erp.com',
  'dept@erp.com',
  'DEPT-ADMIN-001',
  'hr@erp.com',
  'finance@erp.com',
  'online@erp.com',
  'ops@erp.com',
  'operations@erp.com',
  'openschool@erp.com',
  'open-school@erp.com',
  'skill@erp.com',
  'bvoc@erp.com',
  'ceo@erp.com',
  'sales@erp.com',
  'student@erp.com'
];

async function cleanup() {
  const transaction = await sequelize.transaction();
  try {
    console.log('--- STARTING INSTITUTIONAL CLEANSING ---');

    // 1. Phase 1: Structural Decoupling
    console.log('Clearing administrative links (Departments)...');
    await Department.update(
      { adminId: null },
      { where: { adminId: { [Op.in]: DUMMY_UIDS } }, transaction }
    );

    console.log('Sanitizing executive scope identities (CEOPanels)...');
    await CEOPanel.destroy({
      where: { userId: { [Op.in]: DUMMY_UIDS } },
      transaction
    });

    console.log('Clearing identity hierarchy links (Managers)...');
    await User.update(
      { reportingManagerUid: null },
      { where: { reportingManagerUid: { [Op.in]: DUMMY_UIDS } }, transaction }
    );

    // 2. Phase 2: Record Sanitization
    console.log('Sanitizing Task registry...');
    await Task.destroy({
      where: {
        [Op.or]: [
          { assignedTo: { [Op.in]: DUMMY_UIDS } },
          { assignedBy: { [Op.in]: DUMMY_UIDS } }
        ]
      },
      transaction
    });

    console.log('Sanitizing Leave registry...');
    await Leave.destroy({
      where: {
        [Op.or]: [
          { employeeId: { [Op.in]: DUMMY_UIDS } },
          { step1By: { [Op.in]: DUMMY_UIDS } },
          { step2By: { [Op.in]: DUMMY_UIDS } }
        ]
      },
      transaction
    });

    console.log('Sanitizing Lead & Sales pipeline...');
    await Quotation.destroy({ where: { createdBy: { [Op.in]: DUMMY_UIDS } }, transaction });
    await LeadTouchpoint.destroy({ where: { createdBy: { [Op.in]: DUMMY_UIDS } }, transaction });
    await Lead.destroy({
      where: {
        [Op.or]: [
          { assignedTo: { [Op.in]: DUMMY_UIDS } },
          { employeeId: { [Op.in]: DUMMY_UIDS } },
          { bdeId: { [Op.in]: DUMMY_UIDS } }
        ]
      },
      transaction
    });

    console.log('Sanitizing Governance Records (AuditLog, Notifications, Requests)...');
    await AuditLog.destroy({ where: { userId: { [Op.in]: DUMMY_UIDS } }, transaction });
    await Notification.destroy({ where: { userUid: { [Op.in]: DUMMY_UIDS } }, transaction });
    await Referral.destroy({ where: { userId: { [Op.in]: DUMMY_UIDS } }, transaction });
    await CredentialRequest.destroy({ where: { requesterId: { [Op.in]: DUMMY_UIDS } }, transaction });
    await AcademicActionRequest.destroy({
      where: {
        [Op.or]: [
          { requesterId: { [Op.in]: DUMMY_UIDS } },
          { approvedBy: { [Op.in]: DUMMY_UIDS } }
        ]
      },
      transaction
    });

    console.log('Sanitizing Incentive structures...');
    await IncentivePayout.destroy({ where: { userId: { [Op.in]: DUMMY_UIDS } }, transaction });
    await Target.destroy({ where: { targetableId: { [Op.in]: DUMMY_UIDS } }, transaction });

    // Special Case: Phase 3 - Identity Removal
    console.log('Permanently removing dummy identities from User registry...');
    const deletedCount = await User.destroy({
      where: { uid: { [Op.in]: DUMMY_UIDS } },
      transaction
    });

    await transaction.commit();
    console.log(`--- CLEANSING COMPLETE: ${deletedCount} Identities Removed ---`);
  } catch (error) {
    await transaction.rollback();
    console.error('--- CLEANSING ABORTED: TRANSACTION ROLLED BACK ---');
    console.error(error);
  } finally {
    process.exit();
  }
}

cleanup();
