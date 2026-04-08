
import { models } from './src/models/index.js';
import { Op } from 'sequelize';
const { User, Vacancy, Leave, Task, Department } = models;

async function test() {
    try {
        console.log('--- Testing HR Stats Fetch ---');
        const visibilityFilter = {}; // Restricted: false
        const [employeeCount, vacancyCount, pendingLeaves, activeTasks] = await Promise.all([
          User.count({ where: { status: 'active', role: 'employee', ...visibilityFilter } }),
          Vacancy.count({ where: { status: 'OPEN', ...visibilityFilter } }),
          Leave.count({ 
            where: { status: { [Op.like]: 'pending%' } },
            include: [{ model: User, as: 'employee', where: visibilityFilter, required: true }]
          }),
          Task.count({ 
            where: { status: 'pending' },
            include: [{ model: User, as: 'assignee', where: visibilityFilter, required: true }]
          })
        ]);
        console.log('Stats:', { employeeCount, vacancyCount, pendingLeaves, activeTasks });
        
    } catch (error) {
        console.error('CRITICAL STATS ERROR:', error.message);
        console.error('Stack:', error.stack);
    }
    process.exit(0);
}

test();
