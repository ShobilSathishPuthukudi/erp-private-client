import User from '../src/models/User.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

async function seed() {
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  const demoStaff = [
    { uid: 'SALES-DEMO-001', name: 'Rahul Varma', email: 'rahul@ams.co', role: 'sales', password: hashedPassword },
    { uid: 'SALES-DEMO-002', name: 'Priya Sharma', email: 'priya@ams.co', role: 'sales', password: hashedPassword },
    { uid: 'EMP-DEMO-001', name: 'Arjun Das', email: 'arjun@ams.co', role: 'employee', password: hashedPassword },
    { uid: 'EMP-DEMO-002', name: 'Ananya Iyer', email: 'ananya@ams.co', role: 'employee', password: hashedPassword },
  ];

  for (const staff of demoStaff) {
    try {
      await User.upsert(staff);
      console.log(`Seeded: ${staff.name} (${staff.role})`);
    } catch (err) {
      console.error(`Failed to seed ${staff.name}:`, err.message);
    }
  }
  process.exit(0);
}

seed();
