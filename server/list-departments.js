import { models } from './src/models/index.js';

const { Department } = models;

async function run() {
  try {
    const depts = await Department.findAll();
    console.log(JSON.stringify(depts, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
