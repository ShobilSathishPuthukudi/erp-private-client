const { Sequelize, DataTypes, Op } = require('sequelize');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../erp/server/.env') });

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
  host: process.env.DB_HOST,
  dialect: 'mysql',
  logging: false
});

async function find() {
  try {
    const centers = await sequelize.query(
      "SELECT id, name, type, status FROM departments WHERE type IN ('center', 'study-center', 'partner_center')",
      { type: sequelize.QueryTypes.SELECT }
    );
    console.log('--- ALL CENTERS ---');
    console.log(JSON.stringify(centers, null, 2));
    
    // Check for "Demo" string
    const demo = centers.filter(c => c.name.toLowerCase().includes('demo'));
    console.log('--- FOUND DEMO CANDIDATES ---');
    console.log(JSON.stringify(demo, null, 2));
    
  } catch (err) {
    console.error('DB Error:', err.message);
  } finally {
    await sequelize.close();
  }
}

find();
