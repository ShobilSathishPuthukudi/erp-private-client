import { models } from './src/models/index.js';

const { Department } = models;

async function run() {
  try {
    const rawDepts = await Department.findAll({
      attributes: ['id', 'name', 'type', 'parentId']
    });

    console.log('--- ALL DEPARTMENTS DATA ---');
    if (rawDepts.length === 0) {
      console.log('No data in departments table.');
    } else {
      rawDepts.forEach(d => {
        console.log(`ID: ${d.id} | Name: ${d.name} | Type: ${d.type} | ParentId: ${d.parentId}`);
      });
    }

    process.exit(0);
  } catch (err) {
    console.error('Error fetching all data:', err);
    process.exit(1);
  }
}

run();
