import { Sequelize, DataTypes, Op } from 'sequelize';
import dotenv from 'dotenv';
dotenv.config({ path: './erp/server/.env' });

const sequelize = new Sequelize('iits_erp', 'root', 'sqladmin', {
  host: '127.0.0.1',
  dialect: 'mysql',
  logging: false
});

const Department = sequelize.define('department', {
  name: DataTypes.STRING,
  type: DataTypes.STRING,
  status: DataTypes.STRING,
}, { timestamps: true });

async function check() {
  try {
    const centers = await Department.findAll({
      where: {
        type: { [Op.like]: '%center%' }
      },
      raw: true
    });
    console.log('Centers in DB:', JSON.stringify(centers, null, 2));
    
    const types = await Department.findAll({
      attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('type')), 'type']],
      raw: true
    });
    console.log('All department types:', types.map(t => t.type));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

check();
