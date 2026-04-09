import { models } from './src/models/index.js';

const run = async () => {
    try {
        const { Program, Department } = models;
        
        console.log('--- Program Schema ---');
        console.dir(Program.rawAttributes.status);
        
        console.log('--- Department Schema ---');
        console.dir(Department.rawAttributes.status);
        console.dir(Department.rawAttributes.type);
        
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

run();
