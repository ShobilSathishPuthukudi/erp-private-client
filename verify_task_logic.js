import { augmentTaskStatus } from './server/src/utils/taskAugmentation.js';

const now = new Date();

const tests = [
    {
        name: "On-time Task",
        task: { status: 'pending', deadline: new Date(now.getTime() + 100000) },
        expected: { isOverdue: false, isEscalated: false, overdueLabel: null }
    },
    {
        name: "Completed (Overdue by date)",
        task: { status: 'completed', deadline: new Date(now.getTime() - 100000) },
        expected: { isOverdue: false, isEscalated: false, overdueLabel: null }
    },
    {
        name: "Overdue (Within 24h grace)",
        task: { status: 'pending', deadline: new Date(now.getTime() - 10 * 60 * 60 * 1000) }, // 10h ago
        expected: { isOverdue: true, isEscalated: false, overdueLabel: 'Overdue - Administrative Action Required' }
    },
    {
        name: "Escalated (> 24h)",
        task: { status: 'pending', deadline: new Date(now.getTime() - 25 * 60 * 60 * 1000) }, // 25h ago
        expected: { isOverdue: true, isEscalated: true, overdueLabel: 'CRITICAL: ESCALATED TO CEO' }
    }
];

let failed = false;
tests.forEach(test => {
    const result = augmentTaskStatus(test.task);
    const matches = result.isOverdue === test.expected.isOverdue &&
                    result.isEscalated === test.expected.isEscalated &&
                    result.overdueLabel === test.expected.overdueLabel;
    
    if (matches) {
        console.log(`✅ ${test.name}: PASS`);
    } else {
        console.log(`❌ ${test.name}: FAIL`);
        console.log("   Expected:", test.expected);
        console.log("   Got:", result);
        failed = true;
    }
});

if (failed) process.exit(1);
console.log("\nAll logic tests passed successfully.");
