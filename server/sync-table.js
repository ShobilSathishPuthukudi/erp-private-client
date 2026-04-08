import sequelize from './src/config/db.js';
import { models } from './src/models/index.js';

const { AcademicActionRequest } = models;

async function syncTable() {
  try {
    await sequelize.authenticate();
    console.log('DB connected');
    
    // Create table if it doesn't exist
    await AcademicActionRequest.sync({ alter: true });
    
    console.log('academic_action_requests table created/updated successfully.');
  } catch (err) {
    console.error('Migration Failed:', err);
  } finally {
    process.exit(0);
  }
}

syncTable();
