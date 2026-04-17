import Department from '../src/models/Department.js';

async function listDepartments() {
  try {
    const departments = await Department.findAll({
      where: {
        type: ['departments', 'sub-departments', 'department', 'sub-department']
      },
      raw: true
    });

    const mainDept = departments.filter(d => d.parentId === null);
    const subDept = departments.filter(d => d.parentId !== null);

    console.log('MAIN DEPARTMENTS:');
    mainDept.forEach(d => {
      console.log(`- ${d.name} (ID: ${d.id})`);
      const children = subDept.filter(s => s.parentId === d.id);
      if (children.length > 0) {
        children.forEach(c => {
          console.log(`  └─ ${c.name} (Sub-Department, ID: ${c.id})`);
        });
      }
    });

    const orphanedSubs = subDept.filter(s => !mainDept.find(m => m.id === s.parentId));
    if (orphanedSubs.length > 0) {
      console.log('\nORPHANED SUB-DEPARTMENTS (No parent found in list):');
      orphanedSubs.forEach(s => {
        console.log(`- ${s.name} (Parent ID: ${s.parentId})`);
      });
    }

  } catch (error) {
    console.error('Error fetching departments:', error);
  } finally {
    process.exit();
  }
}

listDepartments();
