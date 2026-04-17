import { sequelize, models } from '../src/models/index.js';

const run = async () => {
  try {
    const { PermissionVersion, RolePermissionShadow } = models;
    
    console.log('Synchronizing PermissionVersion...');
    await PermissionVersion.sync({ alter: true });
    
    console.log('Synchronizing RolePermissionShadow...');
    await RolePermissionShadow.sync({ alter: true });
    
    console.log('RBAC Infrastructure tables synchronized.');
    process.exit(0);
  } catch (error) {
    console.error('FOCUSED SYNC ERROR:', error);
    process.exit(1);
  }
};

run();
