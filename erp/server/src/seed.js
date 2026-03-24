import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { models, sequelize } from './models/index.js';

dotenv.config();

async function seed() {
  try {
    await sequelize.sync();
    
    const { User } = models;
    const hashedPassword = await bcrypt.hash('password123', 10);

    const [user, created] = await User.findOrCreate({
      where: { email: 'admin@iits.edu' },
      defaults: {
        uid: 'ORG-ADMIN-001',
        email: 'admin@iits.edu',
        password: hashedPassword,
        name: 'System Admin',
        role: 'org-admin',
        status: 'active'
      }
    });

    if (created) {
      console.log('✅ Seed successful! You can now log in with:');
      console.log('Email: admin@iits.edu');
      console.log('Password: password123');
    } else {
      console.log('Admin user already exists in the database.');
    }
  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    process.exit();
  }
}

seed();
