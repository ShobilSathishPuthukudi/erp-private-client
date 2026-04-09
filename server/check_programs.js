import { models } from './src/models/index.js';

const run = async () => {
  try {
    const { Program, Student, Department } = models;
    const progs = await Program.findAll({ attributes: ['id', 'name', 'subDeptId', 'status'] });
    console.log('Programs data:');
    console.dir(progs.map(p => p.toJSON()));
    
    const students = await Student.findAll({ attributes: ['id', 'name', 'deptId', 'subDepartmentId', 'status'] });
    console.log('Students data:');
    console.dir(students.map(s => s.toJSON()));
    
    // Check all active non-branch departments to see their IDs and names
    const depts = await Department.findAll({ attributes: ['id', 'name', 'type', 'parentId'] });
    console.log('Departments config snippet:');
    console.dir(depts.map(d => d.toJSON()).slice(0, 5)); // Just the first few
    
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

run();
