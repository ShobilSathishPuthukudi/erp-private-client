import sequelize from './src/config/db.js';
import Department from './src/models/Department.js';

async function test() {
  const depts = await Department.findAll({
    order: [['id', 'DESC']],
    limit: 5,
    attributes: ['id', 'name', 'type']
  });
  console.log(depts.map(d => d.toJSON()));
  process.exit();
}
test();
