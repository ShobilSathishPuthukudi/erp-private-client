import { models } from './server/src/models/index.js';
import { Op } from 'sequelize';

const { Task, User, Department, CEOPanel, Notification } = models;

const triggerEscalations = async () => {
  try {
    console.log('[DRY-RUN] Manually triggering Task Escalation logic...');
    const now = new Date();
    const taskGrace = 24;
    const graceCutoff = new Date(now.getTime() - taskGrace * 60 * 60 * 1000);
    
    const allCeoPanels = await CEOPanel.findAll({ where: { status: 'Active' } });
    
    const criticalTasks = await Task.findAll({
      where: { 
        status: { [Op.in]: ['pending', 'in_progress', 'overdue'] },
        deadline: { [Op.lt]: graceCutoff },
        escalationLevel: 'EMPLOYEE'
      },
      include: [
        { model: User, as: 'assignee', include: [{ model: Department, as: 'department' }] }, 
        { model: User, as: 'assigner' }
      ]
    });

    console.log(`[DRY-RUN] Found ${criticalTasks.length} tasks ready for escalation.`);

    for (const task of criticalTasks) {
      const deptName = task.assignee?.department?.name || 'General';
      const targetingCeos = allCeoPanels.filter(p => 
        p.visibilityScope && Array.isArray(p.visibilityScope) && p.visibilityScope.includes(deptName)
      );

      console.log(`[DRY-RUN] Escalating Task: "${task.title}" (Dept: ${deptName}). Targeted CEOs: ${targetingCeos.length}`);

      await task.update({ 
        status: 'overdue',
        escalationLevel: 'CEO',
        escalatedAt: now,
        remarks: `[AUTO-ESCALATION]: Manual Trigger for Verification.`
      });

      for (const panel of targetingCeos) {
        await Notification.create({
          userUid: panel.userId,
          type: 'error',
          message: `CRITICAL ESCALATION [${deptName}]: Task "${task.title}" (Lead: ${task.assignee?.name}) has passed the 24h grace period.`,
          link: '/dashboard/ceo/escalations'
        });
        console.log(`[DRY-RUN] Notification created for CEO UID: ${panel.userId}`);
      }
    }
    
    console.log('[DRY-RUN] Task Escalation logic completed.');
    process.exit(0);
  } catch (error) {
    console.error('[DRY-RUN] Error:', error);
    process.exit(1);
  }
};

triggerEscalations();
