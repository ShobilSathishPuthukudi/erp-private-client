import { sequelize, models } from './src/models/index.js';

async function main() {
  const { User, CEOPanel } = models;

  try {
    await sequelize.authenticate();

    const activePanels = await CEOPanel.findAll({
      where: { status: 'Active' },
      attributes: ['id', 'name', 'userId']
    });

    let repaired = 0;

    for (const panel of activePanels) {
      const user = await User.unscoped().findByPk(panel.userId);
      if (!user) continue;

      const normalizedRole = (user.role || '').toLowerCase().trim();
      if ((normalizedRole === 'ceo' || normalizedRole === 'ceo') && user.status !== 'active') {
        await user.update({ status: 'active' });
        repaired += 1;
        console.log(`Reactivated CEO user ${user.uid} for active panel "${panel.name}" (#${panel.id})`);
      }
    }

    console.log(`CEO repair complete. Reactivated ${repaired} user(s).`);
  } catch (error) {
    console.error('CEO repair failed:', error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

main();
