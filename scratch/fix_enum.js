const { sequelize } = require('./server/src/models/index.js');

async function fixEnum() {
  try {
    console.log('Checking credential_requests table structure...');
    const [results] = await sequelize.query("SHOW COLUMNS FROM credential_requests LIKE 'status'");
    console.log('Current status column:', results[0]);

    if (results[0] && !results[0].Type.includes('cancelled')) {
      console.log('Updating ENUM to include cancelled...');
      await sequelize.query("ALTER TABLE credential_requests MODIFY COLUMN status ENUM('pending', 'approved', 'rejected', 'cancelled') DEFAULT 'pending'");
      console.log('ENUM updated successfully.');
    } else {
      console.log('ENUM already contains cancelled or column not found.');
    }
  } catch (err) {
    console.error('Error fixing ENUM:', err);
  } finally {
    await sequelize.close();
  }
}

fixEnum();
