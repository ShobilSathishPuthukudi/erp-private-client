import fs from 'fs';
import dotenv from 'dotenv';
import { Sequelize, DataTypes } from 'sequelize';

const env = dotenv.parse(fs.readFileSync('.env'));
const sequelize = new Sequelize(env.DB_NAME, env.DB_USER, env.DB_PASS, {
  host: env.DB_HOST,
  port: env.DB_PORT,
  dialect: 'mysql',
  logging: false,
});

async function check() {
  try {
    const [results] = await sequelize.query(`
      SELECT d.name, d.type, csd.subDeptName 
      FROM departments d 
      JOIN center_sub_depts csd ON d.id = csd.centerId 
      WHERE d.type = 'branch'
    `);
    
    if (results.length > 0) {
      console.log('ILLEGAL CONNECTIONS FOUND:');
      console.log(JSON.stringify(results, null, 2));
      console.log('Action required: Remove these connections.');
    } else {
      console.log('No illegal branch-to-subdept connections found.');
    }
  } catch (error) {
    console.error('Check failed:', error);
  } finally {
    await sequelize.close();
  }
}

check();
