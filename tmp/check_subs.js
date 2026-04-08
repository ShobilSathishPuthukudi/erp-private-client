const path = require('path');
const { models } = require(path.join(process.cwd(), 'server/src/models/index.js'));
const { Department } = models;

async function checkSubDepts() {
  const all = await Department.findAll({ attributes: ['id', 'name', 'type', 'parentId'] });
  const subs = all.filter(d => d.parentId !== null);
  console.log('Sub-departments (parentId != null):', JSON.stringify(subs, null, 2));
}

checkSubDepts().catch(console.error);
