import { models } from '../src/models/index.js';
const { Department, Program } = models;
import { Op } from 'sequelize';

(async () => {
  try {
    console.log('--- Institutional Identity Migration ---');
    
    // 1. Map existing Department types to plural standardized forms
    const deptMap = {
      'branch': 'branches',
      'partner-center': 'partner centers',
      'university': 'universities',
      'department': 'departments',
      'sub-department': 'sub-departments'
    };

    // Miscellaneous specific names to be normalized to 'departments'
    const miscTypes = [
      'Academic Operations', 'openschool', 'online', 'skill', 
      'bvoc', 'Finance', 'HR', 'Sales', 'Custom'
    ];

    console.log('Standardizing Department categories...');
    for (const [oldType, newType] of Object.entries(deptMap)) {
      const [count] = await Department.update({ type: newType }, { where: { type: oldType } });
      if (count > 0) console.log(`✓ Re-mapped ${count} records from '${oldType}' to '${newType}'`);
    }
    
    const [miscCount] = await Department.update({ type: 'departments' }, { 
      where: { 
        type: { [Op.in]: miscTypes }
      } 
    });
    if (miscCount > 0) console.log(`✓ Normalized ${miscCount} specialized departments to 'departments'`);

    // 2. Standardize Program types
    console.log('Standardizing Program categories...');
    const [progCount] = await Program.update({ type: 'programs' }, { where: { id: { [Op.gt]: 0 } } });
    if (progCount > 0) console.log(`✓ Unified ${progCount} programs under 'programs' type`);

    console.log('--- Migration Complete ---');
    process.exit(0);
  } catch (err) {
    console.error('Migration Fatal Error:', err);
    process.exit(1);
  }
})();
