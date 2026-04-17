import sequelize from './src/config/db.js';
import { Op } from 'sequelize';
import { models } from './src/models/index.js';

const CENTER_TYPES = [
  'partner centers',
  'partner-center',
  'partner center',
  'study-center',
  'Study centers',
  'study centers'
];

async function resetPartnerCenters() {
  const {
    Department,
    User,
    Student,
    Payment,
    Invoice,
    EMI,
    Mark,
    Result,
    ReregRequest,
    AdmissionSession,
    CenterProgram,
    CenterSubDept,
    ProgramOffering,
    CredentialRequest,
    AccreditationRequest,
    ChangeRequest,
    Announcement,
    AnnouncementRead,
    Lead,
    Notification,
    Attendance,
    Referral,
    SurveyResponse,
    CEOPanel
  } = models;

  console.log('--- PARTNER CENTER RESET STARTED ---');

  const transaction = await sequelize.transaction();

  try {
    const centers = await Department.unscoped().findAll({
      where: { type: { [Op.in]: CENTER_TYPES } },
      attributes: ['id', 'name'],
      transaction
    });

    if (!centers.length) {
      console.log('No partner centers found. Nothing to reset.');
      await transaction.commit();
      return;
    }

    const centerIds = centers.map((center) => center.id);
    const centerUsers = await User.unscoped().findAll({
      where: { deptId: { [Op.in]: centerIds } },
      attributes: ['uid', 'name', 'role'],
      transaction
    });
    const centerUserIds = centerUsers.map((user) => user.uid);

    const students = await Student.findAll({
      where: { centerId: { [Op.in]: centerIds } },
      attributes: ['id'],
      transaction
    });
    const studentIds = students.map((student) => student.id);

    console.log(`Centers queued for deletion: ${centerIds.length}`);
    console.log(`Center users queued for deletion: ${centerUserIds.length}`);
    console.log(`Center students queued for deletion: ${studentIds.length}`);

    if (studentIds.length) {
      await Mark.destroy({ where: { studentId: { [Op.in]: studentIds } }, transaction });
      await Result.destroy({ where: { studentId: { [Op.in]: studentIds } }, transaction });
      await ReregRequest.destroy({ where: { studentId: { [Op.in]: studentIds } }, transaction });
      await EMI.destroy({ where: { studentId: { [Op.in]: studentIds } }, transaction });
      await Invoice.destroy({
        where: {
          [Op.or]: [
            { studentId: { [Op.in]: studentIds } },
            { centerId: { [Op.in]: centerIds } }
          ]
        },
        transaction
      });
      await Payment.destroy({ where: { studentId: { [Op.in]: studentIds } }, transaction });
      await Student.destroy({ where: { id: { [Op.in]: studentIds } }, transaction });
    } else {
      await Invoice.destroy({ where: { centerId: { [Op.in]: centerIds } }, transaction });
    }

    await AdmissionSession.destroy({ where: { centerId: { [Op.in]: centerIds } }, transaction });
    await CenterProgram.destroy({ where: { centerId: { [Op.in]: centerIds } }, transaction });
    await CenterSubDept.destroy({ where: { centerId: { [Op.in]: centerIds } }, transaction });
    await ProgramOffering.destroy({ where: { centerId: { [Op.in]: centerIds } }, transaction });
    await CredentialRequest.destroy({ where: { centerId: { [Op.in]: centerIds } }, transaction });
    await AccreditationRequest.destroy({ where: { centerId: { [Op.in]: centerIds } }, transaction });
    await ChangeRequest.destroy({ where: { centerId: { [Op.in]: centerIds } }, transaction });
    await Announcement.destroy({ where: { centerId: { [Op.in]: centerIds } }, transaction });

    await Lead.update(
      { centerId: null },
      { where: { centerId: { [Op.in]: centerIds } }, transaction }
    );

    if (centerUserIds.length) {
      await AnnouncementRead.destroy({ where: { userId: { [Op.in]: centerUserIds } }, transaction });
      await Notification.destroy({ where: { userUid: { [Op.in]: centerUserIds } }, transaction });
      await Attendance.destroy({ where: { userId: { [Op.in]: centerUserIds } }, transaction });
      await Referral.destroy({ where: { userId: { [Op.in]: centerUserIds } }, transaction });
      await SurveyResponse.destroy({ where: { userUid: { [Op.in]: centerUserIds } }, transaction });
      await CEOPanel.destroy({ where: { userId: { [Op.in]: centerUserIds } }, transaction });
      await User.destroy({ where: { uid: { [Op.in]: centerUserIds } }, transaction });
    }

    await Department.unscoped().destroy({
      where: { id: { [Op.in]: centerIds } },
      transaction
    });

    await transaction.commit();

    console.log('Deleted centers:');
    centers.forEach((center) => {
      console.log(`- [${center.id}] ${center.name}`);
    });
    console.log('--- PARTNER CENTER RESET COMPLETED ---');
  } catch (error) {
    await transaction.rollback();
    console.error('--- PARTNER CENTER RESET FAILED ---');
    console.error(error);
    process.exit(1);
  }
}

resetPartnerCenters()
  .then(async () => {
    await sequelize.close();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error(error);
    await sequelize.close();
    process.exit(1);
  });
