const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });
const { Sequelize, DataTypes, Op } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'erp',
  process.env.DB_USER || 'root',
  process.env.DB_PASS || '',
  {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    dialect: 'mysql',
    logging: false
  }
);

(async () => {
    try {
        const results = await sequelize.query("SELECT id, name, role, email FROM users WHERE name LIKE '%test%' OR email LIKE '%hr%';");
        console.log("Users:", results[0].map(u => ({ id: u.id, uid: u.uid, name: u.name, role: u.role, email: u.email })));
        const leaves = await sequelize.query("SELECT id, employeeId, status FROM leaves;");
        console.log("Leaves:", leaves[0]);
    } catch(e) { console.error(e); }
    process.exit(0);
})();
