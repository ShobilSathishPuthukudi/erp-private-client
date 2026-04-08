import { models } from './src/models/index.js';

const { Department } = models;

async function run() {
  try {
    const departments = await Department.findAll({
      where: { type: 'department' },
      attributes: ['id', 'name', 'shortName', 'status']
    });

    const subDepartments = await Department.findAll({
      where: { type: 'sub-department' },
      attributes: ['id', 'name', 'shortName', 'status', 'parentId']
    });

    console.log('--- DEPARTMENTS ---');
    if (departments.length === 0) {
      console.log('No departments found.');
    } else {
      departments.forEach(d => {
        console.log(`ID: ${d.id} | Name: ${d.name} | Short: ${d.shortName || 'N/A'} | Status: ${d.status}`);
      });
    }

    console.log('\n--- SUB-DEPARTMENTS ---');
    if (subDepartments.length === 0) {
      console.log('No sub-departments found.');
    } else {
      subDepartments.forEach(sd => {
        const parentName = departments.find(d => d.id === sd.parentId)?.name || `Unknown (${sd.parentId})`;
        console.log(`ID: ${sd.id} | Name: ${sd.name} | Parent: ${parentName} | Status: ${sd.status}`);
      });
    }

    process.exit(0);
  } catch (err) {
    console.error('Error fetching hierarchy:', err);
    process.exit(1);
  }
}

run();
