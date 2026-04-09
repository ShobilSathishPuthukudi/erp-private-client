import { sequelize } from './server/src/models/index.js';

const run = async () => {
    try {
        const id = 1;
        const remarks = "Test finalization remarks";
        const request = await sequelize.models.accreditation_request.findByPk(id);
        console.log("Request found", request ? "yes" : "no");
        
        await request.update({ status: 'approved', remarks });
        console.log("update request ok");

        const newProgram = await sequelize.models.program.create({
          name: request.courseName,
          status: 'active',
          universityId: request.assignedUniversityId,
          subDeptId: request.assignedSubDeptId,
          duration: 12,
          maxLeaves: 0
        });
        console.log("program create ok", newProgram.id);

        await request.update({ linkedProgramId: newProgram.id });
        console.log("request linked ok");

        await sequelize.models.program_offering.create({
          centerId: request.centerId,
          programId: newProgram.id,
          status: 'open',
          accreditationRequestId: request.id
        });
        console.log("offering create ok");
        process.exit(0);
    } catch(e) {
        console.error("ERROR CAUGHT:");
        console.error(e);
        process.exit(1);
    }
};

run();
