const path = require('path');
const { models } = require(path.join(process.cwd(), 'server/src/models/index.js'));
const { Department } = models;

async function runUpdate() {
  const departments = await Department.findAll({
    where: { parentId: null, type: 'departments', status: 'active' },
    attributes: ['name']
  });
  console.log('Final Department Names for Metric Card:');
  console.log(JSON.stringify(departments.map(d => d.name), null, 2));
}

runUpdate().catch(console.error);
