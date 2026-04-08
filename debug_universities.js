import { models } from './server/src/models/index.js';
import { Op } from 'sequelize';

const { Department } = models;

async function debugQuery() {
    try {
        console.log('[DEBUG] Running University Query...');
        const universities = await Department.findAll({
            where: { 
                type: 'university', 
                status: { [Op.in]: ['draft', 'staged', 'active'] } 
            },
            attributes: ['id', 'name', 'status']
        });
        console.log('[DEBUG] Results Count:', universities.length);
        console.log('[DEBUG] Results:', JSON.stringify(universities, null, 2));
        
        const allUniversities = await Department.findAll({
            where: { type: 'university' },
            attributes: ['id', 'name', 'status']
        });
        console.log('[DEBUG] Total Universities in DB:', allUniversities.length);
        console.log('[DEBUG] Total Universities:', JSON.stringify(allUniversities, null, 2));

    } catch (error) {
        console.error('[DEBUG] Query Error:', error);
    }
}

debugQuery();
