import { models } from './src/models/index.js';
const run = async () => {
    const { AccreditationRequest } = models;
    await AccreditationRequest.update({ type: 'academic_link' }, { where: { id: 1 } });
    process.exit(0);
};
run();
