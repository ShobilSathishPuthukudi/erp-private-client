import Department from '../src/models/Department.js';
import User from '../src/models/User.js';
import Task from '../src/models/Task.js';
import Student from '../src/models/Student.js';
import Program from '../src/models/Program.js';
import CEOPanel from '../src/models/CEOPanel.js';
import sequelize from '../src/config/db.js';
import { Op } from 'sequelize';

async function consolidateRegistry() {
  const transaction = await sequelize.transaction();
  try {
    console.log('🚀 Starting Institutional Registry Consolidation...');

    const migrationMap = {
      3: 86,  // Academic Operations Department -> Academic Operations
      34: 84, // Finance Department -> Finance
      35: 83, // HR Department -> HR
      38: 85, // Sales Department -> Sales
      8: 90,  // Open School Department -> Open School
      9: 88,  // Online Department -> Online
      10: 89, // Skill Department -> Skill
      11: 87, // BVoc Department -> BVoc
      78: 86, // Sub-department 003 -> Academic Operations (Fallback)
      80: 86, // Test university 001 -> Academic Operations
      81: 86, // Test center 001 -> Academic Operations
      73: 86, // Test department 1 -> Academic Operations
      74: 86, // Test sub-department 1 -> Academic Operations
      77: 86, // Test department 003 -> Academic Operations
      57: 86, // Marketing -> Academic Operations
      82: 86, // jjh -> Academic Operations
      75: 86, // Test branch 1 -> Academic Operations
      76: 86, // Test branch 200 -> Academic Operations
    };

    const targetIds = Object.keys(migrationMap).map(Number);
    const purgeIds = [57, 82, 73, 74, 77, 80, 81, 75, 76, ...targetIds];

    // 1. Migrate Users
    console.log('👥 Migrating personnel records...');
    for (const [oldId, newId] of Object.entries(migrationMap)) {
      const [count] = await User.update(
        { deptId: newId },
        { where: { deptId: oldId }, transaction }
      );
      if (count > 0) console.log(`   - Moved ${count} users from ID ${oldId} to ${newId}`);
    }

    // 2. Migrate Tasks
    console.log('📋 Migrating operational tasks...');
    for (const [oldId, newId] of Object.entries(migrationMap)) {
      const dept = await Department.unscoped().findByPk(oldId, { transaction });
      if (!dept) continue;
      const isMain = !dept.parentId || dept.type === 'departments';
      
      await Task.update(
        isMain ? { departmentId: newId } : { subDepartmentId: newId },
        { where: isMain ? { departmentId: oldId } : { subDepartmentId: oldId }, transaction }
      );
    }

    // 3. Migrate Students
    console.log('🎓 Migrating student records...');
    for (const [oldId, newId] of Object.entries(migrationMap)) {
      const dept = await Department.unscoped().findByPk(oldId, { transaction });
      if (!dept) continue;
      const isMain = !dept.parentId || dept.type === 'departments' || dept.type === 'universities';

      await Student.update(
        isMain ? { deptId: newId } : { subDepartmentId: newId },
        { where: isMain ? { deptId: oldId } : { subDepartmentId: oldId }, transaction }
      );
    }

    // 4. Migrate Programs
    console.log('📚 Migrating program definitions...');
    for (const [oldId, newId] of Object.entries(migrationMap)) {
      await Program.update(
        { subDeptId: newId },
        { where: { subDeptId: oldId }, transaction }
      );
    }

    // 5. Migrate CEO Panel Visibility
    console.log('👁️ Updating CEO Panel visibility scopes...');
    const panels = await CEOPanel.findAll({ transaction });
    for (const panel of panels) {
      let scope = panel.visibilityScope;
      if (Array.isArray(scope)) {
        let changed = false;
        const newScope = scope.map(val => {
          const oldId = String(val);
          if (migrationMap[oldId]) {
            changed = true;
            return String(migrationMap[oldId]);
          }
          return val;
        });
        if (changed) {
          await panel.update({ visibilityScope: newScope }, { transaction });
          console.log(`   - Updated visibility for Panel: ${panel.name}`);
        }
      }
    }

    // 6. Purge Registry
    console.log('🧹 Purging redundant registry records...');
    const deletedCount = await Department.destroy({
      where: { id: { [Op.in]: purgeIds } },
      transaction
    });
    console.log(`   - Successfully removed ${deletedCount} redundant departments.`);

    await transaction.commit();
    console.log('✨ Consolidation complete! Registry now contains exactly 4 Core Pillars and 4 Sub-Departments.');

  } catch (error) {
    await transaction.rollback();
    console.error('❌ Consolidation failed! Transaction rolled back.', error);
  } finally {
    process.exit();
  }
}

consolidateRegistry();
