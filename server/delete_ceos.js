import { sequelize } from './src/models/index.js';

const run = async () => {
  try {
    console.log('Force resetting CEO architecture...');
    
    // Disable foreign key checks to safely drop the entities regardless of bindings
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0;');
    
    // Fetch CEOs
    const ceoUsers = await sequelize.query("SELECT uid FROM Users WHERE role IN ('ceo', 'CEO')", { type: sequelize.QueryTypes.SELECT });
    const allCeoIds = ceoUsers.map(u => u.uid);
    
    // Delete CEOPanels
    await sequelize.query("DELETE FROM CEOPanels;");
    console.log('CEOPanels destroyed.');
    
    if (allCeoIds.length > 0) {
      const idsStr = allCeoIds.map(id => `'${id}'`).join(',');
      
      // Force destroy the orphan users
      await sequelize.query(`DELETE FROM Users WHERE uid IN (${idsStr});`);
      console.log(`Destroyed ${allCeoIds.length} CEO users.`);
      
      // Clean up audit logs and announcements to prevent dead links
      await sequelize.query(`DELETE FROM AuditLogs WHERE userId IN (${idsStr});`);
      await sequelize.query(`DELETE FROM Announcements WHERE authorId IN (${idsStr});`);
    }

    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1;');
    console.log('All provisioned CEOs have been fully purged. Clean slate achieved.');
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

run();
