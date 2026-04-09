import { models } from './server/src/models/index.js';

const run = async () => {
  try {
    const { CEOPanel, User } = models;
    console.log('Finding CEO panels...');
    const panels = await CEOPanel.findAll();
    const userIds = panels.map(p => p.userId);
    
    console.log(`Destroying ${panels.length} CEOPanels...`);
    await CEOPanel.destroy({ where: {} });
    
    if (userIds.length > 0) {
      console.log(`Destroying corresponding Users...`);
      await User.destroy({ where: { uid: userIds } });
    }
    
    // Also catch any stray users with role 'ceo' that might be orphaned
    await User.destroy({ where: { role: 'CEO' } });
    await User.destroy({ where: { role: 'ceo' } });
    
    console.log('All provisioned CEOs have been terminated successfully.');
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

run();
