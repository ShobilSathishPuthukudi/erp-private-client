const path = require('path');
const { models } = require(path.join(process.cwd(), 'server/src/models/index.js'));
const { Department } = models;

async function syncIdentitySchema() {
  // Update departments with parentId != null to type 'sub-departments'
  const all = await Department.findAll({ attributes: ['id', 'parentId', 'type', 'name'] });
  let updatedCount = 0;
  
  for (const dept of all) {
    if (dept.parentId !== null && dept.type !== 'sub-departments') {
      await dept.update({ type: 'sub-departments' });
      updatedCount++;
    }
  }
  
  console.log(`Updated ${updatedCount} sub-departments to the 'sub-departments' identity type.`);
  
  // Final verification for Total Departments Card
  const coreDepts = await Department.findAll({ 
    where: { parentId: null, type: 'departments', status: 'active' },
    attributes: ['name']
  });
  
  console.log('Final Core Departments (for Metric Card):', coreDepts.map(d => d.name));
  
  // Final verification for Total Sub-Departments Card
  const subCount = await Department.count({ 
    where: { type: 'sub-departments', status: 'active' }
  });
  
  console.log('Final Sub-Departments Count:', subCount);
}

syncIdentitySchema().catch(console.error);
