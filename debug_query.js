import { models, sequelize } from './server/src/models/index.js';
import { Op } from 'sequelize';

const { Task, User, Department, CEOPanel } = models;

const debugQuery = async () => {
  try {
    const uid = 'CEO-ACAD-DEFAULT';
    console.log(`[DEBUG] Emulating session for UID: ${uid}`);

    // 1. Emulate applyExecutiveScope
    const panel = await CEOPanel.findOne({ where: { userId: uid, status: 'Active' } });
    if (!panel) {
      console.error('[ERROR] No active CEOPanel found for this UID.');
      process.exit(1);
    }

    console.log(`[DEBUG] CEOPanel Found. Scope: ${JSON.stringify(panel.visibilityScope)}`);

    const scope = Array.isArray(panel.visibilityScope) 
      ? panel.visibilityScope 
      : (typeof panel.visibilityScope === 'string' ? JSON.parse(panel.visibilityScope) : []);

    const depts = await Department.findAll({
      where: { name: { [Op.in]: scope } },
      attributes: ['id', 'name']
    });

    const deptIds = depts.map(d => d.id);
    const names = depts.map(d => d.name);

    console.log(`[DEBUG] Resolved Dept IDs: ${deptIds}`);
    console.log(`[DEBUG] Resolved Dept Names: ${names}`);

    // 2. Run Task Query from ceo.js
    const taskGrace = 24;
    const now = new Date();
    const graceThreshold = new Date(now.getTime() - taskGrace * 60 * 60 * 1000);

    console.log(`[DEBUG] Grace Threshold: ${graceThreshold.toISOString()}`);

    const whereUser = {
      [Op.or]: [
        { deptId: { [Op.in]: deptIds } },
        { subDepartment: { [Op.in]: names } }
      ]
    };

    const tasks = await Task.findAll({
      where: { 
        status: { [Op.ne]: 'completed' },
        deadline: { [Op.lt]: graceThreshold }
      },
      include: [
        { 
          model: User, 
          as: 'assignee', 
          attributes: ['uid', 'name', 'deptId'], 
          required: true,
          where: whereUser,
          include: [{ 
            model: Department, 
            as: 'department', 
            attributes: ['id', 'name'],
            required: true,
            include: [{ 
              model: User, 
              as: 'admin', 
              attributes: ['name', 'email'],
              required: true 
            }] 
          }] 
        }
      ],
      logging: (sql) => console.log(`[SQL] ${sql}`)
    });

    console.log(`[DEBUG] Final Task Count: ${tasks.length}`);
    if (tasks.length > 0) {
      tasks.forEach(t => console.log(`[TASK] ID: ${t.id} | Title: ${t.title} | Assignee: ${t.assignee?.name}`));
    } else {
      console.log('[DEBUG] No tasks found. Checking for partial matches...');
      // Partial check: Check if assignee exists without the department/admin join
      const partialTasks = await Task.findAll({
        where: { status: { [Op.ne]: 'completed' } },
        include: [{ model: User, as: 'assignee', where: whereUser }]
      });
      console.log(`[DEBUG] Partial match (Task + Assignee + Dept Filter) Count: ${partialTasks.length}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('[ERROR] Diagnostic Failure:', error);
    process.exit(1);
  }
};

debugQuery();
