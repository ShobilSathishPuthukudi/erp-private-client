import { models } from './src/models/index.js';

async function test() {
  const { User } = models;
  const users = await User.count({
    where: { uid: ['FIN-ADM-001', 'HR-ADM-001', 'EMP-277432', 'EMP-200630'] }
  });
  console.log('Users found:', users);
}
test();
