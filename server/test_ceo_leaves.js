import sequelize from './src/config/db.js';
import { models } from './src/models/index.js';

(async () => {
    try {
        const { User, Department, Leave } = models;
        const hrUsers = await User.unscoped().findAll({
          include: [{ model: Department, as: 'department', attributes: ['name'] }]
        });

        const hrUids = hrUsers.filter(u => {
          const role = (u.role || '').toLowerCase();
          const sub = (u.subDepartment || '').toLowerCase();
          const deptName = (u.department?.name || '').toLowerCase();
          return role.includes('hr') || sub.includes('hr') || deptName.includes('hr') || role.includes('human resources');
        }).map(u => u.uid);

        console.log("Matched HR Users:", hrUids.length);

        const leavesRaw = await Leave.unscoped().findAll({
          where: {
            employeeId: { [sequelize.Sequelize.Op.in]: hrUids },
            status: { [sequelize.Sequelize.Op.ne]: 'draft' }
          }
        });
        
        console.log("Leaves found for HR users:", leavesRaw.length);
        console.log(JSON.stringify(leavesRaw.map(l => ({ id: l.id, status: l.status, emp: l.employeeId })), null, 2));
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
})();
