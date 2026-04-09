import sequelize from './server/src/config/db.js';
(async () => {
  const [results] = await sequelize.query("SELECT DISTINCT role FROM users;");
  console.log(results);
  process.exit();
})();
