import { models } from '../src/models/index.js';
const { Notification } = models;

async function repairNotificationLinks() {
    console.log('--- Notification Link Repair Protocol ---');
    try {
        const brokenNotifications = await Notification.findAll({
            where: { 
                link: '/dashboard/employee/tasks'
            }
        });

        console.log(`Found ${brokenNotifications.length} notifications with restricted employee links.`);

        for (const notification of brokenNotifications) {
            console.log(`Repairing Notification #${notification.id}: Updating link to /dashboard/tasks`);
            await notification.update({ 
                link: '/dashboard/tasks'
            });
        }

        console.log('--- Repair Complete ---');
    } catch (error) {
        console.error('Repair failed:', error);
    }
    process.exit(0);
}

repairNotificationLinks();
