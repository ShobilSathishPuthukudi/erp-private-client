import sequelize from './src/config/db.js';
import { models } from './src/models/index.js';

(async () => {
    try {
        const users = await models.User.findAll({
            where: {
                email: 'test-hr-employee@example.com'
            },
            include: [{ model: models.Department, as: 'department' }]
        });
        console.log(JSON.stringify(users.map(u => ({uid: u.uid, name: u.name, role: u.role, dept: u.department?.name, email: u.email})), null, 2));
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
})();
