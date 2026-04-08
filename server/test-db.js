import sequelize from './src/config/db.js';
import { models } from './src/models/index.js';

const { AcademicActionRequest, User } = models;

async function testFetch() {
  try {
    await sequelize.authenticate();
    console.log('DB connected');
    const requests = await AcademicActionRequest.findAll({
      where: { requesterId: 'EMP-001' },
      order: [['createdAt', 'DESC']],
      include: [
        { model: User, as: 'requester', attributes: ['name', 'avatar'] }
      ]
    });
    console.log('Success:', requests.length);
  } catch (err) {
    console.error('Test Failed with Error:', err);
  } finally {
    process.exit(0);
  }
}

testFetch();
