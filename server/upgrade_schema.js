import { sequelize } from './src/models/index.js';

const run = async () => {
    try {
        console.log("Starting schema upgrade...");
        
        // 1. Alter ENUM securely
        await sequelize.query(`
            ALTER TABLE accreditation_requests 
            MODIFY COLUMN status ENUM('pending', 'finance_pending', 'approved', 'rejected') DEFAULT 'pending';
        `);
        console.log("✅ ENUM upgraded successfully.");

        // 2. Add routing mapping columns if they don't exist
        try {
            await sequelize.query(`ALTER TABLE accreditation_requests ADD COLUMN assignedUniversityId INT DEFAULT NULL;`);
            console.log("✅ Added assignedUniversityId.");
        } catch(e) { console.log("assignedUniversityId already exists."); }

        try {
            await sequelize.query(`ALTER TABLE accreditation_requests ADD COLUMN assignedSubDeptId INT DEFAULT NULL;`);
            console.log("✅ Added assignedSubDeptId.");
        } catch(e) { console.log("assignedSubDeptId already exists."); }

        
        process.exit(0);
    } catch (e) {
        console.error("Migration failed:", e);
        process.exit(1);
    }
};

run();
