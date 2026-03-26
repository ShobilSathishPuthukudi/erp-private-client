import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { models, sequelize } from './models/index.js';

dotenv.config();

async function seed() {
  try {
    await sequelize.sync();
    
    const { User } = models;
    const hashedPassword = await bcrypt.hash('password123', 10);

    const usersToSeed = [
      { uid: 'ORG-ADMIN-001', email: 'admin@iits.edu', password: hashedPassword, name: 'System Admin', role: 'org-admin', status: 'active' },
      { uid: 'CEO-001', email: 'ceo@iits.edu', password: hashedPassword, name: 'Executive CEO', role: 'ceo', status: 'active' },
      { uid: 'DEPT-ADMIN-001', email: 'dept@iits.edu', password: hashedPassword, name: 'Department Head', role: 'dept-admin', status: 'active' },
      { uid: 'OPS-001', email: 'ops@iits.edu', password: hashedPassword, name: 'Operations Manager', role: 'academic', status: 'active' },
      { uid: 'FIN-001', email: 'finance@iits.edu', password: hashedPassword, name: 'Finance Officer', role: 'finance', status: 'active' },
      { uid: 'HR-001', email: 'hr@iits.edu', password: hashedPassword, name: 'HR Manager', role: 'hr', status: 'active' },
      { uid: 'SALES-001', email: 'sales@iits.edu', password: hashedPassword, name: 'BDE Executive', role: 'sales', status: 'active' },
      { uid: 'CTR-001', email: 'center@iits.edu', password: hashedPassword, name: 'Partner Center', role: 'center', status: 'active' },
      { uid: 'STU-001', email: 'student@iits.edu', password: hashedPassword, name: 'Active Student', role: 'student', status: 'active' },
      { uid: 'EMP-001', email: 'employee@iits.edu', password: hashedPassword, name: 'Staff Member', role: 'employee', status: 'active' },
      { uid: 'OS-001', email: 'openschool@iits.edu', password: hashedPassword, name: 'OpenSchool Admin', role: 'openschool', status: 'active' },
      { uid: 'ON-001', email: 'online@iits.edu', password: hashedPassword, name: 'Online Ed Admin', role: 'online', status: 'active' },
      { uid: 'SK-001', email: 'skill@iits.edu', password: hashedPassword, name: 'Skill Dev Admin', role: 'skill', status: 'active' },
      { uid: 'BV-001', email: 'bvoc@iits.edu', password: hashedPassword, name: 'BVoc Admin', role: 'bvoc', status: 'active' }
    ];

    console.log('🌱 Starting institutional seeding...');

    for (const userData of usersToSeed) {
      const existingEmail = await User.findOne({ where: { email: userData.email } });
      const existingUid = await User.findByPk(userData.uid);

      if (existingEmail || existingUid) {
        console.log(`ℹ️ Existing: ${userData.role} (${userData.email})`);
        continue;
      }

      await User.create(userData);
      console.log(`✅ Seeded: ${userData.role} (${userData.email})`);
    }

    console.log('\n✨ Seeding Complete! Universal Password: password123');

  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    process.exit();
  }
}

seed();
