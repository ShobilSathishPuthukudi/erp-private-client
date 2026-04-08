import { models } from './src/models/index.js';
(async () => {
  try {
    const deps = await models.Department.findAll({ attributes: ['id', 'name', 'type'] });
    const branches = deps.filter(d => ['branch', 'branches'].includes(d.type));
    console.log(JSON.stringify(branches, null, 2));
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
})();
