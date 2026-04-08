import { sequelize, models } from './src/models/index.js';
import { Op } from 'sequelize';

const { User } = models;

async function standardizeCEOs() {
  try {
    console.log('🚀 Starting Executive Identity Standardization...');

    // 1. Update Academic CEO (CEO-ACAD-DEFAULT)
    const academicCEO = await User.findOne({ 
      where: { uid: 'CEO-ACAD-DEFAULT' } 
    });

    if (academicCEO) {
      await academicCEO.update({ email: 'ceo.academic@erp.com' });
      console.log('✅ Standardized Academic CEO: ceo.academic@erp.com');
    } else {
      console.log('ℹ️ Academic CEO (CEO-ACAD-DEFAULT) not found in database.');
    }

    // 2. Update Sub-Dept CEO (CEO-853431)
    const subDeptCEO = await User.findOne({ 
      where: { uid: 'CEO-853431' } 
    });

    if (subDeptCEO) {
      await subDeptCEO.update({ email: 'ceo-sub-dept@erp.com' });
      console.log('✅ Standardized Sub-Dept CEO: ceo-sub-dept@erp.com');
    } else {
      console.log('ℹ️ Sub-Dept CEO (CEO-853431) not found in database.');
    }

    // 3. Update any other legacy references in User table
    const legacyUsers = await User.findAll({
      where: {
        [Op.or]: [
          { email: { [Op.like]: '%@iits.edu' } },
          { email: { [Op.like]: '%@institution.edu' } },
          { email: { [Op.like]: '%@iits.rps' } }
        ]
      }
    });

    for (const user of legacyUsers) {
      const oldEmail = user.email;
      let newEmail = oldEmail;
      
      if (oldEmail.endsWith('@iits.edu')) newEmail = oldEmail.replace('@iits.edu', '@erp.com');
      else if (oldEmail.endsWith('@institution.edu')) newEmail = oldEmail.replace('@institution.edu', '@erp.com');
      else if (oldEmail.endsWith('@iits.rps')) newEmail = oldEmail.replace('@iits.rps', '@erp.com');

      if (newEmail !== oldEmail) {
        await user.update({ email: newEmail });
        console.log(`✅ Migrated legacy identity: ${oldEmail} -> ${newEmail}`);
      }
    }

    console.log('✨ Executive Identity Standardization Complete.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Standardization Failed:', error);
    process.exit(1);
  }
}

standardizeCEOs();
