import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { models, sequelize } from './models/index.js';

dotenv.config();

async function seedBulkEmployees() {
  try {
    const { User, Department } = models;
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Identify all operational units (Departments and Sub-Departments)
    const targetDepts = await Department.findAll({
      where: {
        type: ['departments', 'sub-departments', 'department', 'sub-department']
      }
    });

    console.log(`🌱 Institutional Expansion: Seeding 5 employees per unit for ${targetDepts.length} units...`);

    for (const dept of targetDepts) {
      console.log(`\n🏢 [${dept.type.toUpperCase()}] ${dept.name}`);
      
      for (let i = 1; i <= 5; i++) {
        // Generate deterministic but unique institutional credentials
        const suffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const uid = `EMP-${dept.id}-${i}-${suffix}`;
        const sanitizedDeptName = dept.name.toLowerCase().replace(/[^a-z0-9]/g, '.');
        const email = `${sanitizedDeptName}.staff${i}.${suffix}@erp.com`;
        const name = `${dept.name} Specialist ${i}`;

        const userData = {
          uid,
          email,
          password: hashedPassword,
          devPassword: 'password123',
          name,
          role: 'Employee',
          deptId: dept.id,
          status: 'active',
          // If the unit is a sub-department, map it to the user's subDepartment attribute for internal routing
          subDepartment: (dept.type === 'sub-departments' || dept.type === 'sub-department') ? dept.name : null
        };

        try {
          const [user, created] = await User.findOrCreate({
            where: { email },
            defaults: userData
          });

          if (created) {
            console.log(`   ✅ Authorized: ${name} (${email})`);
          } else {
            console.log(`   ℹ️ Existing Record: ${email}`);
          }
        } catch (err) {
          console.error(`   ❌ Failed to seed employee ${i} for ${dept.name}:`, err.message);
        }
      }
    }

    console.log('\n✨ Institutional Expansion Complete! Universal Password: password123');
  } catch (error) {
    console.error('Critical Seeding Failure:', error);
  } finally {
    process.exit();
  }
}

seedBulkEmployees();
