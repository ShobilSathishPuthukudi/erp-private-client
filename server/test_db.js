import sequelize from './src/config/db.js';
import { models } from './src/models/index.js';
(async () => {
    try {
        const users = await models.User.findAll({
            where: { email: { [sequelize.Sequelize.Op.like]: '%hr%' } },
            include: [{ model: models.Department, as: 'department' }]
        });
        const usersMapped = users.map(u => ({
            name: u.name,
            role: u.role,
            dept: u.department?.name,
            subDept: u.subDepartment
        }));
        console.log(JSON.stringify(usersMapped, null, 2));
    } catch(e) { }
    process.exit(0);
})();
