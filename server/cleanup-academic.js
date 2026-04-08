import sequelize from './src/config/db.js';

async function cleanupAcademic() {
  console.log('--- INITIALIZING ACADEMIC TEARDOWN PROTOCOL ---');
  
  try {
    const tables = [
      'modules',
      'subjects',
      'marks',
      'results',
      'exams',
      'students',
      'admission_sessions',
      'program_offerings',
      'center_programs',
      'rereg_configs',
      'program_fees',
      'programs'
    ];

    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0;');
    console.log('Foreign Key Constraints: DISABLED');

    for (const table of tables) {
      console.log(`Truncating ${table}...`);
      await sequelize.query(`TRUNCATE TABLE \`${table}\`;`);
    }

    console.log('Deleting Institutional Departments (Universities)...');
    await sequelize.query("DELETE FROM `departments` WHERE `type` = 'university';");

    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1;');
    console.log('Foreign Key Constraints: RE-ENABLED');

    console.log('--- ACADEMIC TEARDOWN COMPLETED SUCCESSFULLY ---');
    process.exit(0);
  } catch (error) {
    console.error('--- CRITICAL TEARDOWN FAILURE ---');
    console.error(error);
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1;');
    process.exit(1);
  }
}

cleanupAcademic();
