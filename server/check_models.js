
import { sequelize } from './src/models/index.js';

async function test() {
    console.log('Model Names:', Object.keys(sequelize.models));
    process.exit(0);
}

test();
