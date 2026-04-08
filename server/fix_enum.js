import sequelize from './src/config/db.js';

async function fix() {
  try {
    await sequelize.query("ALTER TABLE departments MODIFY COLUMN type ENUM('universities', 'branches', 'partner centers', 'departments', 'sub-departments', 'department', 'sub-department') NOT NULL DEFAULT 'departments'");
    console.log("ENUM updated successfully.");
  } catch (err) {
    console.error("Failed to update ENUM:", err);
  }
  process.exit();
}
fix();
