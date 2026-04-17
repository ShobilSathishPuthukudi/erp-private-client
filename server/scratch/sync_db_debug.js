import { sequelize, models } from '../src/models/index.js';

const run = async () => {
  try {
    console.log('Synchronizing database models...');
    await sequelize.sync({ alter: true });
    console.log('Database synchronized successfully.');
    
    console.log('Checking for OrgConfig: GLOBAL_PERMISSION_MATRIX...');
    const config = await models.OrgConfig.findOne({ where: { key: 'GLOBAL_PERMISSION_MATRIX' } });
    
    if (!config) {
      console.log('No matrix found in OrgConfig.');
    } else {
      console.log('Matrix found. Attempting to simulate version creation...');
      const { PermissionVersion } = models;
      const lastVersion = await PermissionVersion.max('versionNumber') || 0;
      console.log('Last version:', lastVersion);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('DEBUG ERROR:', error);
    process.exit(1);
  }
};

run();
