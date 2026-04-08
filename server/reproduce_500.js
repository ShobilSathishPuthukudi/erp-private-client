import { models, sequelize } from './src/models/index.js';
import bcrypt from 'bcryptjs';

async function test() {
  const { User, Department, Lead, Program, Notification } = models;
  const t = await sequelize.transaction();
  try {
    const name = "Test Center";
    const email = `test-${Date.now()}@example.com`;
    const phone = "1234567890";
    const code = "EMP-996094"; // From user's URL
    const password = "password123";
    const infrastructure = { labCapacity: 10, classroomCount: 2 };
    const description = "Test description";
    const interest = {
      universityId: 1, // Assumed valid university ID
      programId: 1 // Assumed valid program ID
    };

    console.log('Starting registration simulation...');

    const hashedPassword = await bcrypt.hash(password, 10);

    const bde = await User.findOne({ 
      where: { 
        [sequelize.Sequelize.Op.or]: [
          { referralCode: code },
          { uid: code }
        ]
      } 
    });
    
    if (!bde) {
      console.error('BDE not found');
      await t.rollback();
      return;
    }

    console.log('BDE found:', bde.uid);

    const center = await Department.create({
      name,
      shortName: name.substring(0, 5).toUpperCase(),
      type: 'partner-center',
      status: 'inactive',
      auditStatus: 'pending',
      bdeId: bde.uid,
      metadata: {
        referralCode: code,
        contactPhone: phone,
        infrastructure,
        onboardingNotes: description,
        onboardedAt: new Date().toISOString(),
        primaryInterest: interest
      }
    }, { transaction: t });

    console.log('Department created:', center.id);

    const centerUid = `CTR-${Math.floor(100000 + Math.random() * 900000)}`;
    const centerAdmin = await User.create({
      uid: centerUid,
      email: email,
      password: hashedPassword,
      name: name,
      role: 'Partner Center',
      deptId: center.id,
      status: 'active'
    }, { transaction: t });

    console.log('User created:', centerAdmin.uid);

    await center.update({ adminId: centerUid }, { transaction: t });

    const lead = await Lead.create({
      name,
      email,
      phone,
      source: 'Referral Onboarding',
      bdeId: bde.uid,
      centerId: center.id,
      status: 'CONVERTED',
      notes: description || `Direct onboarding via ${code} (${bde.name})`
    }, { transaction: t });

    console.log('Lead created:', lead.id);

    await t.commit();
    console.log('Transaction committed successfully!');
  } catch (error) {
    console.error('Error during simulation:', error);
    if (t) await t.rollback();
  } finally {
    await sequelize.close();
  }
}

test();
