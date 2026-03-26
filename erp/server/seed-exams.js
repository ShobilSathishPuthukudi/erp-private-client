import { models, sequelize } from './src/models/index.js';
import dotenv from 'dotenv';

dotenv.config();

const { Exam } = models;

async function seedExams() {
  console.log('🌱 Seeding Academic Exams...');

  try {
    // Create an exam with ID 1 for consistency with the frontend request
    const exam = await Exam.findOne({ where: { id: 1 } });
    
    if (exam) {
      console.log('ℹ️ Exam ID 1 already exists. Skipping creation.');
    } else {
      await Exam.create({
        id: 1, // Force ID 1
        name: 'Fall Semester - Semester 1 (Finals)',
        programId: 1, // High School Certificate (from seed-eligibility)
        batch: 'Batch 2026',
        date: new Date(),
        status: 'scheduled'
      });
      console.log('✅ Created Exam ID 1');
    }

    console.log('✨ Exam seeding complete!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    process.exit();
  }
}

seedExams();
