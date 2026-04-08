import { models } from './src/models/index.js';

const { User, Department } = models;

async function listVerifiedAdmins() {
  try {
    console.log('--- Verified Admins (Active Users with Admin Roles) ---');
    const adminUsers = await User.findAll({
      where: {
        status: 'active'
      },
      attributes: ['uid', 'name', 'email', 'role']
    });

    const activeAdmins = adminUsers.filter(u => u.role.toLowerCase().includes('admin'));
    activeAdmins.forEach(u => {
      console.log(`- [${u.uid}] ${u.name} (${u.email}) [Role: ${u.role}]`);
    });

    console.log('\n--- Verified Department Admins (Approved Audit Status) ---');
    const approvedDepts = await Department.findAll({
      where: {
        auditStatus: 'approved'
      },
      include: [{ model: User, as: 'admin', attributes: ['name', 'email', 'uid', 'role'] }]
    });

    approvedDepts.forEach(d => {
      if (d.admin) {
        console.log(`- Dept: ${d.name} | Admin: ${d.admin.name} (${d.admin.email}) [UID: ${d.admin.uid}]`);
      } else {
        console.log(`- Dept: ${d.name} | Admin: NONE (Admin ID: ${d.adminId})`);
      }
    });

    console.log('--------------------------------');
    process.exit(0);
  } catch (error) {
    console.error('Failed to list verified admins:', error);
    process.exit(1);
  }
}

listVerifiedAdmins();
