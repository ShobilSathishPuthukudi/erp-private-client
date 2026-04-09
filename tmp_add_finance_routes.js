import fs from 'fs';

const p = '/Users/shobilsathish/Desktop/ERP/server/src/routes/finance.js';
let content = fs.readFileSync(p, 'utf8');

const injection = `
// --- Accreditation Pipeline ---
router.get('/accreditation-requests', verifyToken, async (req, res) => {
  try {
    const { status } = req.query;
    const AccreditationRequest = sequelize.models.accreditation_request;
    const Department = sequelize.models.department;
    
    // Explicit map fallback for manual fetching if needed, otherwise use models dynamically
    const requests = await AccreditationRequest.findAll({
      where: { status: status || 'finance_pending' },
      include: [
        { model: Department, as: 'center', attributes: ['name'] }
      ]
    });
    
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch accreditation queue' });
  }
});

router.put('/accreditation-requests/:id/approve', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;
    
    const AccreditationRequest = sequelize.models.accreditation_request;
    const Department = sequelize.models.department;
    const Program = sequelize.models.program;
    const ProgramOffering = sequelize.models.program_offering;

    const request = await AccreditationRequest.findByPk(id);
    if (!request) return res.status(404).json({ error: 'Request not found' });

    // Step 1: Approve Request
    await request.update({ status: 'approved', remarks });

    // Step 2: Auto-Generate Official Program
    const newProgram = await Program.create({
      name: request.courseName,
      status: 'active',
      universityId: request.assignedUniversityId,
      subDeptId: request.assignedSubDeptId,
      duration: 12,
      maxLeaves: 0
    });

    await request.update({ linkedProgramId: newProgram.id });

    // Step 3: Link Program to specific center
    await ProgramOffering.create({
      centerId: request.centerId,
      programId: newProgram.id,
      status: 'open',
      accreditationRequestId: request.id
    });

    res.json({ message: 'Program formally finalized and injected into execution architecture' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Finalization protocol failed' });
  }
});
`;

if (!content.includes('/accreditation-requests')) {
    content = content.replace("export default router;", injection + "\nexport default router;");
    fs.writeFileSync(p, content);
    console.log("Added finance endpoint successfully.");
} else {
    console.log("Endpoint already exists.");
}
