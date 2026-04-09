import { sequelize } from './server/src/models/index.js';

const run = async () => {
    try {
        const u = await sequelize.query("SELECT id, name, type, status FROM departments WHERE type LIKE '%universit%';");
        console.dir(u[0]);
        const s = await sequelize.query("SELECT id, name, type, status FROM departments WHERE type LIKE '%sub-dept%' OR type LIKE '%sub-department%';");
        console.dir(s[0]);
        process.exit(0);
    } catch(e) { console.error(e); process.exit(1); }
};
run();
