import sequelize from './src/config/db.js';
import Announcement from './src/models/Announcement.js';
import Holiday from './src/models/Holiday.js';

async function seedBoard() {
  try {
    await sequelize.authenticate();
    console.log('Database connected.');

    // Seed Announcements
    const announcements = [
      {
        title: 'New HR Policy Update',
        message: 'Please review the updated institutional guidelines for the upcoming quarter. All departments must comply with the new reporting standards.',
        priority: 'urgent',
        targetChannel: 'all_employees',
        authorId: 'OSL-ADM-001',
        expiryDate: new Date('2026-12-31')
      },
      {
        title: 'Q2 Performance Reviews',
        message: 'Annual performance appraisals for Q2 will begin next week. Ensure all self-evaluations are submitted by Friday.',
        priority: 'normal',
        targetChannel: 'all_employees',
        authorId: 'OSL-ADM-001',
        expiryDate: new Date('2026-04-30')
      }
    ];

    for (const data of announcements) {
      await Announcement.create(data);
    }
    console.log('Announcements seeded.');

    // Seed Holidays
    const holidays = [
      {
        name: 'Eid al-Fitr',
        date: '2026-04-10',
        description: 'National Holiday - All centers closed.'
      },
      {
        name: 'Vishu',
        date: '2026-04-14',
        description: 'Regional Holiday - Limited operations.'
      }
    ];

    for (const data of holidays) {
      await Holiday.create(data);
    }
    console.log('Holidays seeded.');

    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seedBoard();
