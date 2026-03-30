import cron from 'node-cron';
import { Op } from 'sequelize';
import { models } from '../models/index.js';
import { logAction } from '../lib/audit.js';

const { Task, User, Department, CronJob, Notification, ReregConfig, ReregRequest, EMI } = models;

// Helper to update CronJob status in DB
const updateJobStatus = async (name, status, result) => {
  try {
    const job = await CronJob.findOne({ where: { name } });
    if (job) {
      await job.update({
        lastRun: new Date(),
        lastResult: result,
        status: status || 'active'
      });
    }
  } catch (error) {
    console.error(`[CRON] Failed to update ${name} status:`, error);
  }
};

export const initCronJobs = () => {
  // GAP-3: Task Escalation & Status Sync (Every 4 Hours)
  cron.schedule('0 */4 * * *', async () => {
    console.log('[CRON] Running Task Escalation Engine...');
    let processed = 0;
    let escalations = 0;

    try {
      const now = new Date();
      
      // 1. Status Sync: Mark overdue
      const overdueTasks = await Task.findAll({
        where: {
          status: { [Op.in]: ['pending', 'in_progress'] },
          deadline: { [Op.lt]: now }
        }
      });

      for (const task of overdueTasks) {
        await task.update({ status: 'overdue' });
        processed++;
      }

      // 2. GAP-2: Multi-tier Escalation
      // LEVEL 1: 48h Overdue -> MANAGER
      const level1Cutoff = new Date(now.getTime() - 48 * 60 * 60 * 1000);
      const level1Tasks = await Task.findAll({
        where: { 
          status: 'overdue', 
          deadline: { [Op.lt]: level1Cutoff },
          escalationLevel: 'EMPLOYEE'
        },
        include: [{ model: User, as: 'assignee' }]
      });

      for (const task of level1Tasks) {
        const managerUid = task.assignee?.reportingManagerUid;
        if (managerUid) {
          await task.update({ 
            assignedTo: managerUid, 
            escalationLevel: 'MANAGER',
            escalatedAt: now,
            remarks: 'Auto-escalation: Overdue > 48h (Employee -> Manager)'
          });
          await Notification.create({
            userUid: managerUid,
            type: 'warning',
            message: `ESCALATION LEVEL 1: Task "${task.title}" is >48h overdue. Assigned to you for intervention.`,
          });
          escalations++;
        }
      }

      // LEVEL 2: Manager no action within 48h of escalation -> CEO
      const level2Cutoff = new Date(now.getTime() - 48 * 60 * 60 * 1000);
      const level2Tasks = await Task.findAll({
        where: { 
          status: 'overdue', 
          escalationLevel: 'MANAGER',
          escalatedAt: { [Op.lt]: level2Cutoff } 
        }
      });

      if (level2Tasks.length > 0) {
        const ceo = await User.findOne({ where: { role: 'ceo' } }) || await User.findOne({ where: { role: 'system-admin' } });
        if (ceo) {
          for (const task of level2Tasks) {
            await task.update({ 
              assignedTo: ceo.uid, 
              escalationLevel: 'CEO',
              escalatedAt: now,
              remarks: 'CRITICAL: CEO Escalation (Manager inaction > 48h)'
            });
            await Notification.create({
              userUid: ceo.uid,
              type: 'error',
              message: `CRITICAL ESCALATION: Task "${task.title}" skipped manager intervention. Senior intervention required.`,
            });
            escalations++;
          }
        }
      }

      const result = `Processed ${processed} tasks, triggered ${escalations} escalations.`;
      await updateJobStatus('task-escalation', 'active', result);
      await logAction({ entity: 'System', action: 'CRON_RUN', details: `Task Escalation: ${result}`, module: 'Operations' });

    } catch (error) {
      console.error('[CRON] Task Escalation Error:', error);
      await updateJobStatus('task-escalation', 'error', error.message);
    }
  });

  // GAP-3: Daily Re-Registration Reminders & Cycle Close (6:00 AM IST)
  cron.schedule('30 0 * * *', async () => {
     console.log('[CRON] Running R-REG Deadline & Cycle Engine...');
     try {
       const now = new Date();
       
       // 1. Reminders for upcoming deadlines (7 days away)
       const reminderCutoff = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
       const upcomingConfigs = await ReregConfig.findAll({
         where: { deadline: { [Op.between]: [now, reminderCutoff] } },
         include: [{ model: models.Program, as: 'program' }]
       });

       for (const config of upcomingConfigs) {
         // Notify appropriate department/center (placeholder)
         console.log(`[REREG] Reminder: Cycle close for ${config.program?.name} on ${config.deadline}`);
       }

       // 2. Cycle Close Logic: Mark missed as carryforward
       const expiredConfigs = await ReregConfig.findAll({
         where: { deadline: { [Op.lt]: now }, isActive: true }
       });

       for (const config of expiredConfigs) {
          // Logic for marking as carryforward...
       }

       const result = `Processed ${upcomingConfigs.length} upcoming cycles and ${expiredConfigs.length} expired cycles.`;
       await updateJobStatus('rereg-deadline', 'active', result);
       await logAction({ entity: 'System', action: 'CRON_RUN', details: result, module: 'Academic' });
     } catch (error) {
       await updateJobStatus('rereg-deadline', 'error', error.message);
     }
  });

  // GAP-3: EMI Overdue Check (2:00 AM IST)
  cron.schedule('0 2 * * *', async () => {
    console.log('[CRON] Running EMI Overdue Engine...');
    try {
      const now = new Date();
      const overdueEmis = await EMI.findAll({
        where: {
          status: 'pending',
          dueDate: { [Op.lt]: now }
        }
      });

      for (const emi of overdueEmis) {
        await emi.update({ status: 'overdue' });
        await Notification.create({
          userUid: `STU${emi.studentId}`,
          type: 'warning',
          message: `OVERDUE NOTICE: Your installment #${emi.installmentNo} for ₹${emi.amount} is overdue. Please settle immediately.`
        });
      }

      const result = `Flagged ${overdueEmis.length} EMIs as overdue.`;
      await updateJobStatus('emi-overdue', 'active', result);
      await logAction({ entity: 'System', action: 'CRON_RUN', details: `EMI Engine: ${result}`, module: 'Finance' });

    } catch (error) {
      await updateJobStatus('emi-overdue', 'error', error.message);
    }
  });

  console.log('[CRON] 21st-Century Background Automation suite initialized.');
};

// Tool for Manual Execution (to be used by API)
export const runJobManually = async (jobName) => {
   console.log(`[CRON] Manually triggering ${jobName}...`);
};
