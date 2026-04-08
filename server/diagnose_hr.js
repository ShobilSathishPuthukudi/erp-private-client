import { models, sequelize } from './src/models/index.js';
import bcrypt from 'bcryptjs';

const { User, Vacancy } = models;

async function testRegistration() {
  const t = await sequelize.transaction();
  try {
    const vacancyId = 6; // Validated OPEN vacancy in DB
    const email = 'duplicate_test@erp.com';
    const password = 'password123';
    const name = 'Duplicate Test User';
    const reportingManagerUid = null;
    const role = 'employee';

    const vacancy = await Vacancy.findByPk(vacancyId, { transaction: t });
    if (!vacancy) {
        console.error('Vacancy not found');
        return;
    }

    console.log('--- FIRST ATTEMPT ---');
    const newUser = await User.create({
      uid: `EMP-DUP1-${Date.now().toString().slice(-4)}`,
      email,
      password: await bcrypt.hash(password, 10),
      role: role || 'employee',
      name,
      deptId: vacancy.departmentId,
      subDepartment: vacancy.subDepartment || 'General',
      reportingManagerUid: null,
      status: 'active'
    }, { transaction: t });
    console.log('First user created.');

    console.log('--- SECOND ATTEMPT (DUPLICATE EMAIL) ---');
    try {
        await User.create({
          uid: `EMP-DUP2-${Date.now().toString().slice(-4)}`,
          email, // SAME EMAIL
          password: await bcrypt.hash(password, 10),
          role: role || 'employee',
          name: 'Another User',
          deptId: vacancy.departmentId,
          subDepartment: vacancy.subDepartment || 'General',
          reportingManagerUid: null,
          status: 'active'
        }, { transaction: t });
    } catch (err) {
        console.log('Caught expected error:', err.name);
        if (err.name === 'SequelizeUniqueConstraintError') {
            console.log('SUCCESS: Correctly identified UniqueConstraintError');
        } else {
            throw err;
        }
    }

    console.log('User created successfully');

    vacancy.filledCount += 1;
    if (vacancy.filledCount >= vacancy.count) {
      vacancy.status = 'CLOSED';
    }
    await vacancy.save({ transaction: t });
    console.log('Vacancy updated successfully');

    await t.commit();
    console.log('Transaction committed successfully');
  } catch (error) {
    if (t) await t.rollback();
    console.error('DIAGNOSTIC ERROR:', error);
  } finally {
    await sequelize.close();
  }
}

testRegistration();
