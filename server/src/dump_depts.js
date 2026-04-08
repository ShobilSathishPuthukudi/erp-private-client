import dotenv from 'dotenv';
import { models, sequelize } from './models/index.js';

dotenv.config();

async function dumpDepartments() {
  try {
    const { Department } = models;
    const depts = await Department.findAll({
      attributes: ['name', 'type', 'centerStatus']
    });
    console.log('--- Department Data Dump ---');
    depts.forEach(d => {
      console.log(`- Name: ${d.name.padEnd(25)} | Type: ${d.type.padEnd(15)} | CenterStatus: ${d.centerStatus}`);
    });
    console.log('---------------------------');
  } catch (error) {
    console.error('Dump error:', error);
  } finally {
    process.exit();
  }
}

dumpDepartments();
