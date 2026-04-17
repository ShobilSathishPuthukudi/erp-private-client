import { models } from './server/src/models/index.js';
const { Department } = models;

async function checkCenters() {
  const centers = await Department.findAll({
    where: {
      type: ['partner-center', 'partner center', 'partner centers', 'study-center']
    },
    attributes: ['id', 'name', 'type', 'status', 'auditStatus']
  });
  
  console.log('--- Center Data Analysis ---');
  centers.forEach(c => {
    console.log(`ID: ${c.id} | Name: ${c.name} | Type: ${c.type} | Status: ${c.status} | AuditStatus: ${c.auditStatus}`);
  });
  process.exit(0);
}

checkCenters().catch(err => {
  console.error(err);
  process.exit(1);
});
