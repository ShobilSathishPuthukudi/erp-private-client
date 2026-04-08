import { sequelize, models } from './src/models/index.js';
import bcrypt from 'bcryptjs';

async function revert() {
    try {
        console.log('--- REVERTING IDENTITY CONSOLIDATION ---');

        // 1. Restore User DEMO 
        // We use the known password hash for 'democenter10'
        const passwordHash = await bcrypt.hash('democenter10', 10);
        
        // Ensure CTR-693477 doesn't conflict on email
        await models.User.update(
            { email: 'stale-ctr@email.com', deptId: null }, 
            { where: { uid: 'CTR-693477' } }
        );

        const [demoUser, created] = await models.User.findOrCreate({
            where: { uid: 'DEMO ' },
            defaults: {
                uid: 'DEMO ',
                email: 'demo-center-10@email.com',
                password: passwordHash,
                devPassword: 'democenter10',
                role: 'Partner Center',
                deptId: 71,
                name: 'Demo center 10',
                status: 'active'
            }
        });

        if (!created) {
            await demoUser.update({
                email: 'demo-center-10@email.com',
                password: passwordHash,
                devPassword: 'democenter10',
                role: 'Partner Center',
                deptId: 71,
                name: 'Demo center 10',
                status: 'active'
            });
        }

        // 2. Restore Department link
        await models.Department.update(
            { adminId: 'DEMO ' }, 
            { where: { id: 71 } }
        );

        console.log('--- REVERSION COMPLETE ---');
        console.log('User DEMO  restored and linked to Dept 71.');
        process.exit(0);
    } catch (error) {
        console.error('Reversion Failed:', error);
        process.exit(1);
    }
}

revert();
