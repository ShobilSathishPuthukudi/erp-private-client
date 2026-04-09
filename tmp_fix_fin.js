import fs from 'fs';

const p = '/Users/shobilsathish/Desktop/ERP/server/src/routes/finance.js';
let content = fs.readFileSync(p, 'utf8');

content = content.replace(
  "const requests = await AccreditationRequest.findAll({",
  `
    const requestsRaw = await AccreditationRequest.findAll({
      where: { status: status || 'finance_pending' },
      include: [{ model: Department, as: 'center', attributes: ['name'] }]
    });

    const requests = await Promise.all(requestsRaw.map(async (r) => {
      const u = r.assignedUniversityId ? await Department.findByPk(r.assignedUniversityId) : null;
      const s = r.assignedSubDeptId ? await Department.findByPk(r.assignedSubDeptId) : null;
      return { ...r.toJSON(), assignedUniversityName: u?.name, assignedSubDeptName: s?.name };
    }));
  // ignore this `
);

content = content.replace(
  "where: { status: status || 'finance_pending' },",
  "// replaced"
).replace(
  "include: [",
  "// "
).replace(
  "{ model: Department, as: 'center', attributes: ['name'] }",
  "//"
).replace(
  "]",
  "//"
).replace(
  "});",
  "//"
);

fs.writeFileSync(p, content);
