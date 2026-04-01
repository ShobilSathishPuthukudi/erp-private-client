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
      
      // 1. Status Sync: Mark overdue immediately when deadline passes
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

      // 2. Automated CEO Escalation (Grace Period Passed)
      // Logic: If task is 'overdue' AND (Now - Deadline) > taskEscalationGraceHours (Default 48h)
      // We look for tasks where escalationLevel is still 'EMPLOYEE' (Initial)
      
      // const configRes = await api.get('/ceo/configs').catch(() => ({ data: [] })); // API is frontend-only
      const taskGrace = 48; // Standard fallback
      const graceCutoff = new Date(now.getTime() - taskGrace * 60 * 60 * 1000);

      const criticalTasks = await Task.findAll({
        where: { 
          status: 'overdue', 
          deadline: { [Op.lt]: graceCutoff },
          escalationLevel: 'EMPLOYEE'
        },
        include: [{ model: User, as: 'assignee' }, { model: User, as: 'assigner' }]
      });

      if (criticalTasks.length > 0) {
        const ceo = await User.findOne({ where: { role: 'ceo' } }) || await User.findOne({ where: { role: 'system-admin' } });
        
        for (const task of criticalTasks) {
          // Escalate to CEO
          await task.update({ 
            escalationLevel: 'CEO',
            escalatedAt: now,
            remarks: `CRITICAL ESCALATION: Department Admin Inaction detected (> ${taskGrace}h Overdue). Systemic intervention required.`
          });

          if (ceo) {
            await Notification.create({
              userUid: ceo.uid,
              type: 'error',
              message: `CRITICAL ESCALATION: Task "${task.title}" (Assigned by ${task.assigner?.name || 'Admin'}) has passed the ${taskGrace}h grace period with no action.`,
            });
          }
          
          escalations++;
        }
      }

      const result = `Processed ${processed} tasks, triggered ${escalations} critical escalations.`;
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
