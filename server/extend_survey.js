import { models } from './src/models/index.js';

async function extendSurvey() {
  try {
    const [updatedCount] = await models.Survey.update(
      { expiryDate: new Date('2026-12-31T23:59:59Z') },
      { where: { id: 5 } }
    );
    
    console.log(`Successfully extended ${updatedCount} Survey(s).`);
    process.exit(0);
  } catch (err) {
    console.error('Extension failed:', err);
    process.exit(1);
  }
}

extendSurvey();
