import { models } from './src/models/index.js';
import { Op } from 'sequelize';

const run = async () => {
  try {
    const { Department, Program, Student, Task, Leave } = models;
    
    const univs = await Department.count({ where: { type: 'university' } });
    const progs = await Program.count();
    const centers = await Department.count({ where: { type: 'branch' } });
    const students = await Student.count();
    const tasks = await Task.count();
    const leaves = await Leave.count();
    
    console.log(`Database native counts:`);
    console.log(`Universities: ${univs}`);
    console.log(`Programs: ${progs}`);
    console.log(`Study Centers: ${centers}`);
    console.log(`Students: ${students}`);
    console.log(`Tasks: ${tasks}`);
    console.log(`Leaves: ${leaves}`);
    
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

run();
