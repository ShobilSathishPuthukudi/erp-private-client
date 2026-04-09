const { models } = require('./models/index.js');
const { Op } = require('sequelize');

async function checkUsers() {
  try {
    const users = await models.User.findAll({
      where: { 
        role: { [Op.like]: '%Sales%' } 
      },
      attributes: ['uid', 'name', 'email', 'role', 'status', 'createdAt'],
      order: [['createdAt', 'DESC']]
    });
    
    const logs = await models.AuditLog.findAll({
      where: { 
        action: 'AUTHORITY_SUCCESSION'
      },
      order: [['timestamp', 'DESC']],
      limit: 10
    });

    console.log(JSON.stringify({ users, logs }, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkUsers();
