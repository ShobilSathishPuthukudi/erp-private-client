import express from 'express';
import { models, sequelize } from '../models/index.js';
import { verifyToken } from '../middleware/verifyToken.js';
import validate from '../middleware/validate.js';
import { universitySchema, programSchema } from '../lib/schemas.js';
import { logAction } from '../lib/audit.js';

const router = express.Router();
const { Department, Program, Student, ProgramFee, User, AdmissionSession, CredentialRequest, ProgramOffering, Exam, Mark, Result, Payment } = models;

const isAcademicOrAdmin = (req, res, next) => {
  const allowed = ['academic', 'org-admin', 'system-admin'];
  if (!allowed.includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied: Academic privileges required' });
  }
  next();
};

// ==========================================
// TELEMETRY & DASHBOARD STATS
// ==========================================

router.get('/stats', verifyToken, isAcademicOrAdmin, async (req, res) => {
  try {
    const totalUniversities = await Department.count({ where: { type: 'university' } });
    const activePrograms = await Program.count(); // Count all structural program nodes
    const pendingReviews = await Student.count({ where: { enrollStatus: 'pending' } });
    
    // Simple revenue approximation (sum of all payments for academic students)
    const payments = await Payment.findAll({
      attributes: [[sequelize.fn('SUM', sequelize.col('amount')), 'total']],
      raw: true
    });
    const revenue = payments[0]?.total || 0;

    res.json({
      totalUniversities,
      activePrograms,
      pendingReviews,
      revenue
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to aggregate institutional telemetry' });
  }
});

// ==========================================
// UNIVERSITIES (Departments with type='university')
// ==========================================

router.get('/universities', verifyToken, isAcademicOrAdmin, async (req, res) => {
  try {
    const unis = await Department.findAll({
      where: { type: 'university' },
      attributes: {
        include: [
          [sequelize.literal(`(SELECT COUNT(*) FROM programs WHERE programs.universityId = department.id)`), 'totalPrograms'],
          [sequelize.literal(`(SELECT COUNT(*) FROM programs WHERE programs.universityId = department.id AND programs.status = 'active')`), 'activePrograms'],
          [sequelize.literal(`(SELECT COUNT(*) FROM programs WHERE programs.universityId = department.id AND programs.status = 'open')`), 'openPrograms']
        ]
      },
      order: [['createdAt', 'DESC']]
    });
    res.json(unis);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch universities' });
  }
});

router.get('/universities/:id', verifyToken, isAcademicOrAdmin, async (req, res) => {
  try {
    const uni = await Department.findByPk(req.params.id, {
      include: [
        { model: Program, attributes: ['id', 'name', 'type', 'status'] }
      ]
    });
    if (!uni || uni.type !== 'university') return res.status(404).json({ error: 'University not found' });
    res.json(uni);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch university details' });
  }
});

router.post('/universities', verifyToken, isAcademicOrAdmin, validate(universitySchema), async (req, res) => {
  try {
    const { name, status, accreditation, websiteUrl, affiliationDoc } = req.body;
    const uni = await Department.create({
      name,
      type: 'university',
      adminId: req.user.uid,
      status: status || 'active',
      accreditation,
      websiteUrl,
      affiliationDoc
    });
    await logAction({
       userId: req.user.uid,
       action: 'CREATE',
       entity: 'University',
       details: `Established university branch: ${uni.name}`,
       module: 'Academic'
    });

    res.status(201).json(uni);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create university' });
  }
});

router.put('/universities/:id', verifyToken, isAcademicOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, status, accreditation, websiteUrl, affiliationDoc } = req.body;
    const uni = await Department.findOne({ where: { id, type: 'university' } });
    if (!uni) return res.status(404).json({ error: 'University not found' });

    await uni.update({ name, status, accreditation, websiteUrl, affiliationDoc });
    res.json(uni);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update university' });
  }
});

router.delete('/universities/:id', verifyToken, isAcademicOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const uni = await Department.findOne({ where: { id, type: 'university' } });
    if (!uni) return res.status(404).json({ error: 'University not found' });

    await uni.destroy();
    res.json({ message: 'University records permanently revoked.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to execute deletion protocol.' });
  }
});

// ==========================================
// CENTERS (Departments with type='center')
// ==========================================

router.get('/centers', verifyToken, isAcademicOrAdmin, async (req, res) => {
  try {
    const centers = await Department.findAll({
      where: { type: 'center' },
      attributes: ['id', 'name', 'status', 'description', 'logo']
    });
    res.json(centers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch global center roster' });
  }
});

// ==========================================
// ACADEMIC PROGRAMS
// ==========================================

router.get('/programs', verifyToken, isAcademicOrAdmin, async (req, res) => {
  try {
    const programs = await Program.findAll({
      include: [
        { model: Department, as: 'university', attributes: ['name'] },
        { model: ProgramFee, as: 'fees', attributes: ['id', 'name', 'isActive'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(programs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch global programs' });
  }
});

router.get('/programs/:id', verifyToken, isAcademicOrAdmin, async (req, res) => {
  try {
    const program = await Program.findByPk(req.params.id, {
      include: [
        { model: Department, as: 'university', attributes: ['id', 'name'] },
        { model: ProgramFee, as: 'fees', where: { isActive: true }, required: false },
        { model: Student, attributes: ['id', 'name', 'enrollStatus'] },
        { 
            model: ProgramOffering, 
            as: 'offeringCenters',
            include: [{ model: Department, as: 'center', attributes: ['id', 'name'] }]
        }
      ]
    });
    if (!program) return res.status(404).json({ error: 'Program core not found' });
    res.json(program);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch program details' });
  }
});

router.post('/programs', verifyToken, isAcademicOrAdmin, validate(programSchema), async (req, res) => {
  try {
    const { name, universityId, duration, type, intakeCapacity } = req.body;
    
    // SubDept mapping (simplified for now, usually correlates to Dept ID)
    const subDeptId = 0; // Default or map based on type if needed
    
    const p = await Program.create({
      name,
      universityId: universityId || null,
      duration,
      type,
      subDeptId,
      intakeCapacity: intakeCapacity || 0
    });
    await logAction({
       userId: req.user.uid,
       action: 'CREATE',
       entity: 'Program',
       details: `Configured academic program: ${p.name}`,
       module: 'Academic'
    });

    res.status(201).json(p);
  } catch (error) {
    res.status(500).json({ error: 'Failed to construct program framework' });
  }
});

router.put('/programs/:id', verifyToken, isAcademicOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, universityId, duration, subDeptId, intakeCapacity } = req.body;
    
    const p = await Program.findByPk(id);
    if (!p) return res.status(404).json({ error: 'Program core not found' });

    await p.update({ name, universityId: universityId || null, duration, subDeptId: subDeptId || 0, intakeCapacity: intakeCapacity || 0 });
    res.json(p);
  } catch (error) {
    res.status(500).json({ error: 'Failed to apply program edits' });
  }
});

router.delete('/programs/:id', verifyToken, isAcademicOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const p = await Program.findByPk(id);
    if (!p) return res.status(404).json({ error: 'Program core not found' });

    await p.destroy();
    res.json({ message: 'Program safely sunsetted.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to execute deletion.' });
  }
});

// ==========================================
// ACADEMIC STUDENT REVIEW & MARKS ENTRY
// ==========================================

router.get('/students', verifyToken, isAcademicOrAdmin, async (req, res) => {
  try {
    const students = await Student.findAll({
      include: [{ model: Program, attributes: ['name'] }],
      order: [['createdAt', 'DESC']]
    });
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch global student roster' });
  }
});

router.put('/students/:id/marks', verifyToken, isAcademicOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { marks, enrollStatus } = req.body;
    
    const student = await Student.findByPk(id);
    if (!student) return res.status(404).json({ error: 'Student asset not located' });

    // Patch JSON or override entirely
    const updatedMarks = marks || student.marks || {};
    
    await student.update({ 
      marks: updatedMarks,
      enrollStatus: enrollStatus || student.enrollStatus
    });
    
    res.json({ message: 'Academic transcript saved successfully.', student });
  } catch (error) {
    res.status(500).json({ error: 'Failed to write marks telemetry to DB' });
  }
});

// ==========================================
// ACADEMIC SESSIONS (BATCHES)
// ==========================================

router.get('/sessions', verifyToken, isAcademicOrAdmin, async (req, res) => {
  try {
    const sessions = await AdmissionSession.findAll({
      include: [
        { model: Program, attributes: ['name', 'type'] },
        { model: Department, as: 'subDept', attributes: ['name'] }
      ],
      attributes: {
        include: [
          [sequelize.literal(`(SELECT COUNT(*) FROM students WHERE students.programId = admission_session.programId AND students.enrollStatus != 'rejected')`), 'enrolledCount']
        ]
      },
      order: [['createdAt', 'DESC']]
    });
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch academic sessions' });
  }
});

router.post('/sessions', verifyToken, isAcademicOrAdmin, async (req, res) => {
  try {
    const { name, programId, startDate, endDate, maxCapacity } = req.body;
    
    const program = await Program.findByPk(programId);
    if (!program) return res.status(404).json({ error: 'Program core not found' });

    // Auto-trigger finance if Skill dept
    const financeStatus = program.type === 'Skill' ? 'pending' : 'approved';
    const isActive = financeStatus === 'approved';

    const session = await AdmissionSession.create({
      name,
      programId,
      subDeptId: program.subDeptId,
      startDate,
      endDate,
      maxCapacity,
      financeStatus,
      isActive
    });

    await logAction({
       userId: req.user.uid,
       action: 'CREATE',
       entity: 'AdmissionSession',
       details: `Initialized academic batch: ${session.name} [Finance: ${financeStatus}]`,
       module: 'Academic'
    });

    res.status(201).json(session);
  } catch (error) {
    res.status(500).json({ error: 'Failed to initialize session node' });
  }
});

router.put('/sessions/:id', verifyToken, isAcademicOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, startDate, endDate, maxCapacity, isActive } = req.body;
    
    const session = await AdmissionSession.findByPk(id);
    if (!session) return res.status(404).json({ error: 'Session node not found' });

    await session.update({ name, startDate, endDate, maxCapacity, isActive });
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: 'Failed to reconcile session parameters' });
  }
});

// ==========================================
// SECURE CREDENTIAL REVEAL WORKFLOW
// ==========================================

router.get('/credentials/requests', verifyToken, isAcademicOrAdmin, async (req, res) => {
  try {
    const requests = await CredentialRequest.findAll({
      where: { requesterId: req.user.uid },
      include: [{ model: Department, as: 'center', attributes: ['name', 'status'] }],
      order: [['createdAt', 'DESC']]
    });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reveal audit trail' });
  }
});

router.post('/credentials/request', verifyToken, isAcademicOrAdmin, async (req, res) => {
  try {
    const { centerId, remarks } = req.body;
    
    // Validate target
    const center = await Department.findOne({ where: { id: centerId, type: 'center' } });
    if (!center) return res.status(404).json({ error: 'Target center node not located' });

    const request = await CredentialRequest.create({
      centerId,
      requesterId: req.user.uid,
      remarks,
      ipAddress: req.ip || '0.0.0.0',
      status: 'pending'
    });

    await logAction({
       userId: req.user.uid,
       action: 'REQUEST',
       entity: 'CredentialReveal',
       details: `Requested credential access for center: ${center.name}`,
       module: 'Academic'
    });

    res.status(201).json(request);
  } catch (error) {
    res.status(500).json({ error: 'Credential request protocol failure' });
  }
});

router.get('/credentials/reveal/:id', verifyToken, isAcademicOrAdmin, async (req, res) => {
  try {
    const request = await CredentialRequest.findByPk(req.params.id, {
      include: [{ model: Department, as: 'center' }]
    });

    if (!request) return res.status(404).json({ error: 'Request node not found' });
    if (request.status !== 'approved') return res.status(403).json({ error: 'Awaiting Finance clearance for reveal' });
    
    // Check reveal expiration
    if (request.revealUntil && new Date() > new Date(request.revealUntil)) {
      return res.status(403).json({ error: 'Credential reveal window has expired' });
    }

    await logAction({
       userId: req.user.uid,
       action: 'REVEAL',
       entity: 'CredentialReveal',
       details: `REVEALED credentials for center: ${request.center.name}`,
       module: 'Academic'
    });

    res.json({
      loginId: request.center.loginId,
      password: request.center.password // Usually this would be decrypted here
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reveal credentials from vault' });
  }
});

// ==========================================
// EXAMS & RESULTS (ASSESSMENTS)
// ==========================================

router.get('/exams', verifyToken, isAcademicOrAdmin, async (req, res) => {
  try {
    const exams = await Exam.findAll({
      include: [{ model: Program, attributes: ['name', 'type'] }],
      order: [['date', 'DESC']]
    });
    res.json(exams);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch exam schedule' });
  }
});

router.post('/exams', verifyToken, isAcademicOrAdmin, async (req, res) => {
  try {
    const { name, programId, batch, date } = req.body;
    const exam = await Exam.create({ name, programId, batch, date, status: 'scheduled' });
    
    await logAction({
       userId: req.user.uid,
       action: 'CREATE',
       entity: 'Exam',
       details: `Scheduled institutional exam: ${name} for ${batch}`,
       module: 'Academic'
    });

    res.status(201).json(exam);
  } catch (error) {
    res.status(500).json({ error: 'Failed to schedule exam entry' });
  }
});

router.get('/exams/:id/students', verifyToken, isAcademicOrAdmin, async (req, res) => {
  try {
    const exam = await Exam.findByPk(req.params.id);
    if (!exam) return res.status(404).json({ error: 'Exam node not found' });

    // Fetch students in this program and batch
    // Assuming batch mapping is done via AdmissionSession or metadata
    const students = await Student.findAll({
      where: { 
        programId: exam.programId,
        enrollStatus: 'active'
      },
      include: [{
        model: Mark,
        as: 'examMarks',
        where: { examId: exam.id },
        required: false
      }]
    });

    res.json({ exam, students });
  } catch (error) {
    res.status(500).json({ error: 'Failed to synchronize student assessment roster' });
  }
});

router.post('/exams/:id/marks', verifyToken, isAcademicOrAdmin, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { marks } = req.body; // Array of { studentId, subjectName, theory, practical, internal }
    const examId = req.params.id;

    for (const m of marks) {
      const total = (parseFloat(m.theory) || 0) + (parseFloat(m.practical) || 0) + (parseFloat(m.internal) || 0);
      
      // Upsert mark entry
      const [markEntry, created] = await Mark.findOrCreate({
        where: { studentId: m.studentId, examId, subjectName: m.subjectName },
        defaults: { ...m, examId, totalMarks: total },
        transaction: t
      });

      if (!created) {
        await markEntry.update({ ...m, totalMarks: total }, { transaction: t });
      }
    }

    await t.commit();
    
    await logAction({
       userId: req.user.uid,
       action: 'UPDATE_MARKS',
       entity: 'Mark',
       details: `Bulk recorded marks for Exam ID: ${examId}`,
       module: 'Academic'
    });

    res.json({ message: 'Academic marks reconciled successfully' });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ error: 'Failed to finalize marks entry' });
  }
});

export default router;
