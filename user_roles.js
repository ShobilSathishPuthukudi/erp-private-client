import { models } from './server/src/models/index.js';
async function test() {
  const users = await models.User.findAll({ attributes: ['uid', 'name', 'role', 'email'] });
  console.log(users.map(u => ({ uid: u.uid, name: u.name, role: u.role, em: u.email })));
  process.exit(0);
}
test();
