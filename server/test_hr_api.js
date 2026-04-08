
import { models } from './src/models/index.js';
const { User, Department } = models;

async function test() {
    try {
        console.log('--- Testing HR Employees Fetch ---');
        const employees = await User.findAll({
          where: {}, 
          attributes: { exclude: ['password'] },
          include: [
            { model: Department, as: 'department', attributes: ['name'] },
            { model: User, as: 'manager', attributes: ['name', 'uid'] }
          ],
          order: [['createdAt', 'DESC']]
        });
        console.log('Employees found:', employees.length);
        
        console.log('--- Testing HR Vacancies Fetch ---');
        const { Vacancy } = models;
        const vacancies = await Vacancy.findAll({
          where: {},
          include: [{ model: Department, as: 'department', attributes: ['name'] }],
          order: [['createdAt', 'DESC']]
        });
        console.log('Vacancies found:', vacancies.length);
        
    } catch (error) {
        console.error('CRITICAL DATABASE ERROR:', error.message);
        console.error('Stack:', error.stack);
    }
    process.exit(0);
}

test();
