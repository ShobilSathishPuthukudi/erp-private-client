import { models } from './src/models/index.js';
import { Op } from 'sequelize';

const run = async () => {
    const { AccreditationRequest, Department } = models;
    
    // Simulate what the API is doing
    const unit = undefined; // the route had /dashboard/operations/accreditation without ?unit=
    const roleNormalized = 'academic operations department'; 
    const targetType = unit || (['organization admin', 'operations admin', 'operations administrator'].includes(roleNormalized) ? null : roleNormalized);
    
    console.log({ targetType });

    const requests = await AccreditationRequest.findAll({
      where: { 
          status: 'pending',
          type: targetType ? targetType : { [Op.ne]: null }
      },
      include: [
        { model: Department, as: 'center', attributes: ['id', 'name'] }
      ]
    });
    
    console.log("Raw SQL result size:", requests.length);
    console.dir(requests.map(r => r.toJSON()));
    process.exit(0);
};

run();
