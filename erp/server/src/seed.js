import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { models, sequelize } from './models/index.js';

dotenv.config();

async function seed() {
  try {
    // await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    // await sequelize.sync();
    // await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('Skipping sync, assuming schema is stable.');
    
    const { User } = models;
    const hashedPassword = await bcrypt.hash('password123', 10);

    const usersToSeed = [
      { uid: 'ORG-ADMIN-001', email: 'admin@erp.com', password: hashedPassword, devPassword: 'password123', name: 'Org Admin', role: 'org-admin', status: 'active' },
      { uid: 'CEO-001', email: 'ceo@erp.com', password: hashedPassword, devPassword: 'password123', name: 'Executive CEO', role: 'ceo', status: 'active' },
      { uid: 'CEO-ACAD-DEFAULT', email: 'ceo.academic@erp.com', password: hashedPassword, devPassword: 'password123', name: 'Academic CEO', role: 'ceo', status: 'active' },
      { uid: 'DEPT-ADMIN-001', email: 'dept@erp.com', password: hashedPassword, devPassword: 'password123', name: 'Department Head', role: 'dept-admin', status: 'active' },
      { uid: 'OPS-001', email: 'ops@erp.com', password: hashedPassword, devPassword: 'password123', name: 'Operations Manager', role: 'academic', status: 'active' },
      { uid: 'FIN-001', email: 'finance@erp.com', password: hashedPassword, devPassword: 'password123', name: 'Finance Officer', role: 'finance', status: 'active' },
      { uid: 'HR-001', email: 'hr@erp.com', password: hashedPassword, devPassword: 'password123', name: 'HR Manager', role: 'hr', status: 'active' },
      { uid: 'SALES-DEMO-001', name: 'Rahul Varma', email: 'rahul@erp.com', role: 'sales', password: hashedPassword, devPassword: 'password123', status: 'active' },
      { uid: 'SALES-DEMO-002', name: 'Priya Sharma', email: 'priya@erp.com', role: 'sales', password: hashedPassword, devPassword: 'password123', status: 'active' },
      { uid: 'EMP-DEMO-001', name: 'Arjun Das', email: 'arjun@erp.com', role: 'employee', password: hashedPassword, devPassword: 'password123', status: 'active' },
      { uid: 'EMP-DEMO-002', name: 'Ananya Iyer', email: 'ananya@erp.com', role: 'employee', password: hashedPassword, devPassword: 'password123', status: 'active' },
      { uid: 'STU-001', email: 'student@erp.com', password: hashedPassword, devPassword: 'password123', name: 'Active Student', role: 'student', status: 'active' },
      { uid: 'EMP-001', email: 'employee@erp.com', password: hashedPassword, devPassword: 'password123', name: 'Staff Member', role: 'employee', status: 'active' },
      { uid: 'OS-001', email: 'openschool@erp.com', password: hashedPassword, devPassword: 'password123', name: 'OpenSchool Admin', role: 'openschool', status: 'active' },
      { uid: 'ON-001', email: 'online@erp.com', password: hashedPassword, devPassword: 'password123', name: 'Online Ed Admin', role: 'online', status: 'active' },
      { uid: 'SK-001', email: 'skill@erp.com', password: hashedPassword, devPassword: 'password123', name: 'Skill Dev Admin', role: 'skill', status: 'active' },
      { uid: 'BV-001', email: 'bvoc@erp.com', password: hashedPassword, devPassword: 'password123', name: 'BVoc Admin', role: 'bvoc', status: 'active', subDepartment: 'BVoc' }
    ];


    console.log('🌱 Starting institutional seeding...');

    for (const userData of usersToSeed) {
      const existingEmail = await User.findOne({ where: { email: userData.email } });
      const existingUid = await User.findByPk(userData.uid);

      if (existingEmail || existingUid) {
        const u = existingEmail || existingUid;
        await u.update(userData);
        console.log(`ℹ️ Synchronized: ${userData.role} (${userData.email})`);
        continue;
      }

      await User.create(userData);
      console.log(`✅ Seeded: ${userData.role} (${userData.email})`);

      // Special handling for CEO Panel mapping
      if (userData.uid.startsWith('CEO-ACAD')) {
        await models.CEOPanel.create({
          name: 'CEO - Academic',
          userId: userData.uid,
          visibilityScope: ['8', '9', '10', '11'], // OpenSchool, Online, Skill, BVoc
          status: 'Active',
          devCredential: 'password123'
        });
        console.log(`✨ Provisioned CEOPanel for: ${userData.name}`);
      }
    }

    console.log('\n✨ Seeding Complete! Universal Password: password123');

  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    process.exit();
  }
}

seed();
