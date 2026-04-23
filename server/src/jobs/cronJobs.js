import cron from 'node-cron';
import { Op } from 'sequelize';
import { models } from '../models/index.js';
import { logAction } from '../lib/audit.js';

const { Task, User, Department, CronJob, Notification, ReregConfig, ReregRequest, EMI, CEOPanel } = models;

const HOURS_24 = 24 * 60 * 60 * 1000;

const getDeptTaskLink = (role = '') => {
  const roleLower = role.toLowerCase().trim();
  if (roleLower === 'hr admin' || roleLower === 'hr') return '/dashboard/hr/tasks';
  if (roleLower === 'finance admin' || roleLower === 'finance') return '/dashboard/finance/tasks';
  if (roleLower === 'sales & crm admin' || roleLower === 'sales') return '/dashboard/sales/tasks';
  if (roleLower.includes('operations') || roleLower.includes('academic')) return '/dashboard/operations/tasks';
  if (['open school admin', 'online department admin', 'skill department admin', 'bvoc department admin'].includes(roleLower)) {
    if (roleLower.includes('open school')) return '/dashboard/subdept/openschool/tasks';
    if (roleLower.includes('online')) return '/dashboard/subdept/online/tasks';
    if (roleLower.includes('skill')) return '/dashboard/subdept/skill/tasks';
    if (roleLower.includes('bvoc')) return '/dashboard/subdept/bvoc/tasks';
  }
  return '/dashboard/tasks';
};

const escalateTaskToCeo = async (task, allCeoPanels, now, reason) => {
  const deptName = task.assignee?.department?.name || 'General';
  const targetingCeos = allCeoPanels.filter(p =>
    p.visibilityScope && Array.isArray(p.visibilityScope) && p.visibilityScope.includes(deptName)
  );

  await task.update({
    escalationLevel: 'CEO',
    escalatedAt: now,
    deptAdminDecision: task.deptAdminDecision === 'GRACE_GRANTED' ? 'GRACE_GRANTED' : 'ESCALATED_TO_CEO',
    remarks: reason
  });

  if (targetingCeos.length > 0) {
    for (const panel of targetingCeos) {
      await Notification.create({
        userUid: panel.userId,
        type: 'error',
        message: `CRITICAL ESCALATION [${deptName}]: Task "${task.title}" (Lead: ${task.assignee?.name}) requires CEO intervention.`,
        link: '/dashboard/ceo/escalations'
      });
    }
  } else {
    const fallbackAdmin = await User.findOne({ where: { role: 'Organization Admin' } });
    if (fallbackAdmin) {
      await Notification.create({
        userUid: fallbackAdmin.uid,
        type: 'error',
        message: `UNMAPPED ESCALATION [${deptName}]: Task "${task.title}" requires oversight but no CEO is authorized for this sector.`,
        link: '/dashboard/org-admin/alerts/escalated'
      });
    }
  }

  if (task.assignedTo) {
    await Notification.create({
      userUid: task.assignedTo,
      panelScope: task.assignee?.role?.toLowerCase()?.trim() || null,
      type: 'warning',
      message: `TASK ESCALATED: "${task.title}" is now under CEO review due to overdue completion.`,
      link: '/dashboard/employee/tasks'
    });
  }
};

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
    let deptAdminNotifications = 0;
    let escalationsToCeo = 0;

    try {
      const now = new Date();
      const allCeoPanels = await CEOPanel.findAll({ where: { status: 'Active' } });
      
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

      // 2. First escalation: notify the department admin once a task is overdue.
      const deptReviewTasks = await Task.findAll({
        where: { 
          status: { [Op.ne]: 'completed' },
          deadline: { [Op.lt]: now },
          escalationLevel: 'EMPLOYEE'
        },
        include: [
          { model: User, as: 'assignee', include: [{ model: Department, as: 'department' }] }, 
          { model: User, as: 'assigner' }
        ]
      });

      for (const task of deptReviewTasks) {
        const deptAdminUid = task.assignee?.department?.adminId;
        const deptAdmin = deptAdminUid ? await User.findOne({ where: { uid: deptAdminUid } }) : null;

        // [GOVERNANCE] Institutional Handover tasks escalate directly to CEO after deadline
        if (task.isInstitutionalHandover) {
          await escalateTaskToCeo(
            task,
            allCeoPanels,
            now,
            'CRITICAL ESCALATION: Institutional Handover task exceeded deadline. Direct CEO oversight required.'
          );
          escalationsToCeo++;
          continue;
        }

        if (!deptAdmin) {
          await escalateTaskToCeo(
            task,
            allCeoPanels,
            now,
            'CRITICAL ESCALATION: No Department Admin is mapped for this overdue task. CEO intervention required.'
          );
          escalationsToCeo++;
          continue;
        }

        await task.update({
          escalationLevel: 'DEPT_ADMIN',
          deptAdminNotifiedAt: now,
          deptAdminDecision: 'PENDING_REVIEW',
          deptAdminGraceUntil: null,
          remarks: 'Department Admin review required for overdue task.'
        });

        await Notification.create({
          userUid: deptAdmin.uid,
          type: 'warning',
          message: `OVERDUE TASK REVIEW: "${task.title}" assigned to ${task.assignee?.name || 'employee'} requires your action. Escalate now or grant a 24h grace period.`,
          link: getDeptTaskLink(deptAdmin.role)
        });
        deptAdminNotifications++;
      }

      // 3. Second escalation: CEO only after no action or grace expiry.
      const deptAdminPendingTasks = await Task.findAll({
        where: {
          status: { [Op.ne]: 'completed' },
          escalationLevel: 'DEPT_ADMIN'
        },
        include: [
          { model: User, as: 'assignee', include: [{ model: Department, as: 'department' }] },
          { model: User, as: 'assigner' }
        ]
      });

      for (const task of deptAdminPendingTasks) {
        const notifiedAt = task.deptAdminNotifiedAt ? new Date(task.deptAdminNotifiedAt) : null;
        const noActionWindowExpired = notifiedAt ? (now.getTime() - notifiedAt.getTime()) >= HOURS_24 : true;
        const graceExpired = task.deptAdminDecision === 'GRACE_GRANTED' &&
          task.deptAdminGraceUntil &&
          new Date(task.deptAdminGraceUntil) <= now;

        if (task.deptAdminDecision === 'ESCALATED_TO_CEO' || graceExpired || (task.deptAdminDecision !== 'GRACE_GRANTED' && noActionWindowExpired)) {
          await task.update({ 
            status: 'overdue'
          });
          await escalateTaskToCeo(
            task,
            allCeoPanels,
            now,
            task.deptAdminDecision === 'GRACE_GRANTED'
              ? 'CRITICAL ESCALATION: Department Admin grace period expired without resolution.'
              : 'CRITICAL ESCALATION: Department Admin did not act within 24 hours.'
          );
          escalationsToCeo++;
        }
      }

      const result = `Processed ${processed} tasks, notified ${deptAdminNotifications} department admins, triggered ${escalationsToCeo} CEO escalations.`;
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
