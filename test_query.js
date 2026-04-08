
import sequelize from './server/src/config/db.js';
import { models } from './server/src/models/index.js';
const { Department } = models;

async function test() {
  try {
    const unis = await Department.findAll({
      where: { type: 'university' },
      attributes: {
        include: [
          [sequelize.literal(`(SELECT COUNT(*) FROM programs WHERE programs.universityId = department.id)`), 'totalPrograms'],
        ]
      },
      logging: console.log,
      limit: 1
    });
    console.log('Success:', unis.length);
  } catch (error) {
    console.error('Error details:', error.message);
  } finally {
    await sequelize.close();
  }
}
test();
