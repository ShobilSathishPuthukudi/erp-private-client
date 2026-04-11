import { models } from './server/src/models/index.js';
const { User } = models;

async function diagnose() {
  console.log('--- DIAGNOSTIC START ---');
  
  // 1. Try to find CEO by email normally
  const email = 'ceo.academic@erp.com'; // From seed
  const userScoped = await User.findOne({ where: { email } });
  console.log(`Scoped search for ${email}: ${userScoped ? 'FOUND' : 'NOT FOUND'}`);
  
  // 2. Try to find CEO by email unscoped
  const userUnscoped = await User.unscoped().findOne({ where: { email } });
  console.log(`Unscoped search for ${email}: ${userUnscoped ? 'FOUND' : 'NOT FOUND'}`);
  
  if (userUnscoped) {
    console.log(`User Roll: ${userUnscoped.role}, Status: ${userUnscoped.status}`);
  }

  process.exit();
}

diagnose().catch(err => {
  console.error(err);
  process.exit(1);
});
