import { models } from '../src/models/index.js';
const { Task, User } = models;

async function repairTasks() {
    console.log('--- Task Department Metadata Repair Protocol ---');
    try {
        const orphanedTasks = await Task.findAll({
            where: { departmentId: null }
        });

        console.log(`Found ${orphanedTasks.length} tasks with missing department metadata.`);

        for (const task of orphanedTasks) {
            const targetUser = await User.findOne({ where: { uid: task.assignedTo } });
            if (targetUser && (targetUser.deptId || targetUser.departmentId)) {
                const deptId = targetUser.deptId || targetUser.departmentId;
                console.log(`Repairing Task #${task.id} (${task.title}): Setting DeptID to ${deptId}`);
                await task.update({ 
                    departmentId: deptId,
                    subDepartmentId: targetUser.subDepartment 
                });
            } else {
                console.warn(`Could not resolve department for Task #${task.id} (Assignee: ${task.assignedTo})`);
            }
        }

        console.log('--- Repair Complete ---');
    } catch (error) {
        console.error('Repair failed:', error);
    }
    process.exit(0);
}

repairTasks();
