import bcrypt from 'bcryptjs';
import { models } from './src/models/index.js';

const { User, Department } = models;

async function seedAdmins() {
  try {
    const departments = await Department.findAll();
    const password = await bcrypt.hash('password123', 10);

    console.log(`Found ${departments.length} departments to seed.`);

    for (const dept of departments) {
      const slug = dept.name.toLowerCase().replace(/\s+/g, '-');
      const email = `${slug}@erp.com`;
      
      // Refined prefix mapping to avoid institutional UID collisions
      const prefixMap = {
        'Operations': 'OPS',
        'Open School': 'OSL',
        'Finance': 'FIN',
        'HR': 'HR',
        'Sales': 'SAL',
        'BVoc': 'BVC',
        'Online': 'ONL',
        'Skill': 'SKI'
      };
      
      const prefix = prefixMap[dept.name] || dept.name.substring(0, 3).toUpperCase();
      const uid = `${prefix}-ADM-001`;

      // Determine role string based on institutional naming conventions
      let role = slug;
      if (slug === 'operations') role = 'operations';
      else if (slug === 'open-school') role = 'openschool';
      else if (!['hr', 'finance', 'sales', 'online', 'skill', 'bvoc'].includes(slug)) {
        role = 'dept-admin';
      }

      console.log(`Processing ${dept.name}: Email=${email}, UID=${uid}, Role=${role}`);

      // 1. Create or Update User by UID to ensure domain migration
      const [user, created] = await User.findOrCreate({
        where: { uid },
        defaults: {
          email,
          password,
          name: `${dept.name} Administrator`,
          role,
          deptId: dept.id,
          status: 'active'
        }
      });

      if (!created) {
        await user.update({
          email,
          name: `${dept.name} Administrator`,
          role,
          deptId: dept.id,
          status: 'active'
        });
      }

      // 2. Link as Department Admin in the Department model
      await dept.update({ adminId: user.uid });
      console.log(`✅ Success: ${user.email} assigned as admin for ${dept.name}`);
    }

    console.log('\nInstitutional Workforce Seeding Complete.');
    process.exit(0);
  } catch (error) {
    console.error('CRITICAL: Seeding Failed:', error);
    process.exit(1);
  }
}

seedAdmins();
