import { models } from './src/models/index.js';

async function run() {
  try {
    const depts = await models.Department.findAll({
      attributes: ['id', 'name', 'type', 'parentId']
    });

    const main = depts.filter(d => !d.parentId);
    const sub = depts.filter(d => d.parentId);

    console.log('### DEPARTMENTS');
    main.forEach(d => {
      console.log(`- ${d.name} (Type: ${d.type}, ID: ${d.id})`);
    });

    console.log('\n### SUB-DEPARTMENTS');
    sub.forEach(s => {
      const p = depts.find(d => d.id === s.parentId);
      console.log(`- ${s.name} (Parent: ${p ? p.name : 'Unknown'}, Type: ${s.type}, ID: ${s.id})`);
    });

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
