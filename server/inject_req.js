import { models } from './src/models/index.js';

const run = async () => {
  try {
    const { AccreditationRequest, Department } = models;
    
    // Make sure we have a test center 
    const testCenter = await Department.findOne({ where: { type: 'partner centers' } }) || await Department.create({ name: 'Demo Study Center', type: 'partner centers' });
    
    const newReq = await AccreditationRequest.create({
      centerId: testCenter.id,
      courseName: "Advanced Machine Learning Diploma",
      universityName: "National Technical Board",
      type: "course_validation",
      status: "pending",
      subDeptId: 9 // Online Department
    });
    
    console.log(`Successfully generated dummy request! ID: ACC-${newReq.id}`);
    
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

run();
