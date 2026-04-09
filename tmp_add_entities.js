import fs from 'fs';

const p = '/Users/shobilsathish/Desktop/ERP/server/src/routes/subDept.js';
let content = fs.readFileSync(p, 'utf8');

const injection = `
router.get('/accreditation-ops/entities', verifyToken, isSubDeptAdmin, async (req, res) => {
  try {
    const universities = await Department.findAll({ where: { type: 'universities', status: 'active' }, attributes: ['id', 'name'] });
    const subDepts = await Department.findAll({ where: { type: 'sub-departments', status: 'active' }, attributes: ['id', 'name'] });
    res.json({ universities, subDepts });
  } catch (error) { res.status(500).json({ error: 'Failed to fetch routing entities' }); }
});
`;

if (!content.includes('/accreditation-ops/entities')) {
    content = content.replace("router.get('/accreditation-requests',", injection + "\nrouter.get('/accreditation-requests',");
    fs.writeFileSync(p, content);
    console.log("Added endpoint successfully.");
} else {
    console.log("Endpoint already exists.");
}
