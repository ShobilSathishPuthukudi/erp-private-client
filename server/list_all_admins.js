
import { models } from './src/models/index.js';
import { Op } from 'sequelize';

async function listAdmins() {
  try {
    const adminRoles = [
      'HR Admin', 'Finance Admin', 'Sales & CRM Admin', 
      'Open School Admin', 'Online Department Admin', 
      'Skill Department Admin', 'BVoc Department Admin', 
      'Academic Operations Admin', 'Organization Admin', 'CEO'
    ];

    const admins = await models.User.findAll({
      where: {
        role: { [Op.in]: adminRoles }
      },
      attributes: ['uid', 'name', 'email', 'role', 'deptId', 'status'],
      include: [{ model: models.Department, as: 'department', attributes: ['name'] }]
    });

    console.log(JSON.stringify(admins, null, 2));
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

listAdmins();
