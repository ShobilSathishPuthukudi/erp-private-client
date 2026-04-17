import { sequelize } from '../server/src/models/index.js';

async function check() {
  try {
    const [results] = await sequelize.query('SELECT * FROM departments');
    console.log('Raw Total Departments:', results.length);
    results.forEach(r => {
      console.log(`ID: ${r.id} | Name: ${r.name} | Type: ${r.type} | Status: ${r.status} | AuditStatus: ${r.auditStatus}`);
    });
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
