
import { models } from './src/models/index.js';
import sequelize from './src/config/db.js';

async function checkDemoCenter() {
  try {
    const user = await models.User.findOne({
      where: { email: 'demo-center@erp.com' },
      include: [{ model: models.Department, as: 'department' }]
    });

    if (!user) {
      console.log('No user found with email demo@erp.com');
      // Maybe it's under another email or name
      const allCenters = await models.User.findAll({
        where: { role: ['center', 'study-center'] }
      });
      console.log('All Centers:', allCenters.map(c => ({ uid: c.uid, name: c.name, email: c.email, deptId: c.deptId })));
      return;
    }

    console.log('User found:', {
      uid: user.uid,
      name: user.name,
      email: user.email,
      role: user.role,
      deptId: user.deptId
    });

    const centerId = user.deptId;
    if (centerId) {
       const programs = await models.CenterProgram.findAll({
         where: { centerId },
         include: [models.Program]
       });
       console.log(`Programs for centerId ${centerId}:`, programs.length);
       programs.forEach(p => {
         console.log(`- Program: ${p.Program?.name} (ID: ${p.programId}), Active: ${p.isActive}`);
       });
    } else {
       console.log('User has no deptId assigned.');
       const centerAsAdmin = await models.Department.findOne({ where: { adminId: user.uid, type: 'center' } });
       if (centerAsAdmin) {
         console.log('Found center where user is admin:', { id: centerAsAdmin.id, name: centerAsAdmin.name });
         const programs = await models.CenterProgram.findAll({
           where: { centerId: centerAsAdmin.id },
           include: [models.Program]
         });
         console.log(`Programs for centerId ${centerAsAdmin.id}:`, programs.length);
       } else {
         console.log('No center found associated with this user.');
       }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

checkDemoCenter();
