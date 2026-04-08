import { models, sequelize } from './src/models/index.js';

async function checkCredentialRequests() {
  try {
    const list = await models.CredentialRequest.findAll({
      limit: 10,
      order: [['createdAt', 'DESC']]
    });
    console.log('--- Credential Requests ---');
    console.log(JSON.stringify(list, null, 2));

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkCredentialRequests();
