import dotenv from 'dotenv';
import { models, sequelize } from './models/index.js';
import { Op } from 'sequelize';

dotenv.config();

async function wipeHR() {
  try {
    const { 
      User, Vacancy, Task, Leave, Attendance, 
      Announcement, AnnouncementRead, Holiday, 
      Survey, SurveyResponse, AuditLog, 
      AcademicActionRequest 
    } = models;

    console.log('🧹 Starting HR Data Wipe...');

    // 1. Delete Survey related data
    await SurveyResponse.destroy({ where: {}, force: true });
    await Survey.destroy({ where: {}, force: true });
    console.log('✅ Surveys & Responses cleared');

    // 2. Delete Tasks
    await Task.destroy({ where: {}, force: true });
    console.log('✅ Tasks cleared');

    // 3. Delete Leave & Attendance
    await Leave.destroy({ where: {}, force: true });
    await Attendance.destroy({ where: {}, force: true });
    console.log('✅ Leave & Attendance cleared');

    // 4. Delete Announcements (Notices)
    await AnnouncementRead.destroy({ where: {}, force: true });
    await Announcement.destroy({ where: {}, force: true });
    console.log('✅ Announcements cleared');

    // 5. Delete Holidays
    await Holiday.destroy({ where: {}, force: true });
    console.log('✅ Holidays cleared');

    // 6. Delete Vacancies
    await Vacancy.destroy({ where: {}, force: true });
    console.log('✅ Vacancies cleared');

    // 7. Delete AcademicActionRequests (Performance Audit/Registration)
    await AcademicActionRequest.destroy({ where: {}, force: true });
    console.log('✅ AcademicActionRequests cleared');

    // 8. Delete Employees (Seeded and Dynamic)
    // We keep HR managers, CEOs, and Admins to avoid locking out the user
    const deletedEmployees = await User.destroy({
      where: {
        [Op.or]: [
          { role: 'employee' },
          { uid: { [Op.like]: 'EMP-%' } },
          { email: 'employee@erp.com' }
        ]
      },
      force: true
    });
    console.log(`✅ Employees cleared (${deletedEmployees} records)`);

    // 9. Cleanup AuditLogs related to these categories (Performance Audit context)
    await AuditLog.destroy({
      where: {
        entity: { [Op.in]: ['User', 'Vacancy', 'Task', 'Leave', 'Attendance', 'Survey', 'Announcement'] }
      },
      force: true
    });
    console.log('✅ HR-related AuditLogs cleared');

    console.log('\n✨ HR Data Wipe Successful!');
  } catch (error) {
    console.error('❌ Wipe failed:', error);
  } finally {
    process.exit();
  }
}

// Check for dry-run if needed, but here we execute
wipeHR();
