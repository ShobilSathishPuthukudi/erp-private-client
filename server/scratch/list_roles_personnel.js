import { models } from '../src/models/index.js';

async function listAll() {
    const roles = await models.Role.findAll({ attributes: ['name', 'isAdminEligible'] });
    const users = await models.User.findAll({ 
        where: { role: { [Symbol.for('ne')]: 'student' } }, 
        attributes: ['uid', 'name', 'role'], 
        include: [{ model: models.Department, as: 'department', attributes: ['name'] }] 
    });

    console.log('--- ROLES ---');
    console.log(JSON.stringify(roles, null, 2));
    console.log('--- PERSONNEL ---');
    console.log(JSON.stringify(users, null, 2));
    process.exit(0);
}

listAll();
