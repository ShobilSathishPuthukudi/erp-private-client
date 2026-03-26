import express from 'express';
import { models, sequelize } from '../models/index.js';
import { verifyToken, isAcademicOrAdmin, isOpsOrAdmin, isArchitectureAdmin } from '../middleware/verifyToken.js';
import validate from '../middleware/validate.js';
import { universitySchema, programSchema } from '../lib/schemas.js';
import { logAction } from '../lib/audit.js';

const router = express.Router();
const { Department, Program, Student, ProgramFee, User, AdmissionSession, CredentialRequest, ProgramOffering, Exam, Mark, Result, Payment, Subject, Module, CenterSubDept } = models;

const getSubDeptId = (user) => {
  if (!user) return null;
  const unitStr = (user.subDepartment || user.role || '').toLowerCase();
  if (unitStr.includes('openschool')) return 8;
  if (unitStr.includes('online')) return 9;
  if (unitStr.includes('skill')) return 10;
  if (unitStr.includes('bvoc')) return 11;
  return null;
};

// ==========================================
// TELEMETRY & DASHBOARD STATS
// ==========================================

router.get('/stats', verifyToken, isAcademicOrAdmin, async (req, res) => {
  try {
    const subDeptAdminRoles = ['SUB_DEPT_ADMIN', 'openschool', 'online', 'skill', 'bvoc', 'Openschool', 'Online', 'Skill', 'Bvoc'];
    const isSubDeptAdmin = subDeptAdminRoles.includes(req.user.role);

    const totalUniversities = await Department.count({ where: { type: 'university' } });
    const activePrograms = await Program.count({ where: isSubDeptAdmin ? { subDeptId: subDeptId } : {} });
    const pendingReviews = await Student.count({ 
      where: isSubDeptAdmin 
        ? { programId: { [Op.in]: sequelize.literal(`(SELECT id FROM programs WHERE subDeptId = ${subDeptId})`) }, enrollStatus: 'pending' } 
        : { enrollStatus: 'pending' } 
    });
    
    // Revenue isolation
    const payments = await Payment.findAll({
      attributes: [[sequelize.fn('SUM', sequelize.col('amount')), 'total']],
      where: isSubDeptAdmin ? {
        studentId: { [Op.in]: sequelize.literal(`(SELECT id FROM students WHERE programId IN (SELECT id FROM programs WHERE subDeptId = ${subDeptId}))`) }
      } : {},
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

router.post('/universities', verifyToken, isArchitectureAdmin, validate(universitySchema), async (req, res) => {
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

router.put('/universities/:id', verifyToken, isArchitectureAdmin, async (req, res) => {
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

router.delete('/universities/:id', verifyToken, isArchitectureAdmin, async (req, res) => {
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
router.get('/programs', verifyToken, isAcademicOrAdmin, async (req, res) => {
  try {
    const { subDeptId } = req.query;
    const whereClause = {};
    
    if (['SUB_DEPT_ADMIN', 'openschool', 'online', 'skill', 'bvoc'].includes(req.user.role)) {
      whereClause.subDeptId = getSubDeptId(req.user);
    } else if (subDeptId) {
      whereClause.subDeptId = subDeptId;
    }

    const programs = await Program.findAll({
      where: whereClause,
      include: [
        { model: Department, as: 'university', attributes: ['name'] },
        { model: ProgramFee, as: 'fees', attributes: ['id', 'name', 'isActive'] },
        { model: Subject, as: 'subjects', attributes: ['id', 'name', 'credits'] }
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
        },
        {
            model: Subject,
            as: 'subjects',
            include: [{ model: Module, as: 'modules', attributes: ['id', 'description'] }]
        }
      ]
    });
    if (!program) return res.status(404).json({ error: 'Program core not found' });
    res.json(program);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch program details' });
  }
});

router.post('/programs', verifyToken, isArchitectureAdmin, validate(programSchema), async (req, res) => {
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

router.put('/programs/:id', verifyToken, isArchitectureAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, universityId, duration, subDeptId, intakeCapacity } = req.body;
    
    if (subDeptId && subDeptId !== p.subDeptId) {
      const studentCount = await Student.count({ where: { programId: id } });
      if (studentCount > 0) {
        return res.status(400).json({ error: 'Governance Error: Cannot reassign Sub-Department while students are enrolled in this program.' });
      }
    }

    await p.update({ 
      ...req.body,
      universityId: universityId || p.universityId, 
      subDeptId: subDeptId || p.subDeptId 
    });
    res.json(p);
  } catch (error) {
    res.status(500).json({ error: 'Failed to apply program edits' });
  }
});

router.delete('/programs/:id', verifyToken, isArchitectureAdmin, async (req, res) => {
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
    const { status, programId, stage, subDeptId } = req.query;
    const whereClause = {};
    if (status) whereClause.enrollStatus = status;
    if (programId) whereClause.programId = programId;
    if (stage) whereClause.reviewStage = stage;
    if (subDeptId) whereClause.subDepartmentId = subDeptId;

    // Isolation: Sub-Dept Admin only sees their unit's students
    if (['SUB_DEPT_ADMIN', 'openschool', 'online', 'skill', 'bvoc', 'Openschool', 'Online', 'Skill', 'Bvoc'].includes(req.user.role)) {
      whereClause.subDepartmentId = getSubDeptId(req.user);
    }

    const students = await Student.findAll({
      where: whereClause,
      include: [
        { model: Program, attributes: ['id', 'name', 'subDeptId'] },
        { model: Department, as: 'center', attributes: ['id', 'name'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch academic candidates' });
  }
});

router.put('/students/:id/verify-eligibility', verifyToken, isOpsOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks, stageOverride } = req.body;
    
    const student = await Student.findByPk(id, {
      include: [
        { model: Department, as: 'center' },
        { model: Program, attributes: ['id', 'type', 'subDeptId'] }
      ]
    });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const isSubDeptAdmin = ['SUB_DEPT_ADMIN', 'openschool', 'online', 'skill', 'bvoc', 'Openschool', 'Online', 'Skill', 'Bvoc'].includes(req.user.role);

    const isOpsAdmin = ['academic', 'org-admin', 'system-admin'].includes(req.user.role);

    // 1. Sub-Dept Admin Review Phase
    if (isSubDeptAdmin) {
        if (student.reviewStage !== 'SUB_DEPT') {
            return res.status(400).json({ error: 'Governance Error: Student has already passed unit-level review.' });
        }
        
        const nextStage = status === 'approved' ? 'OPS' : 'SUB_DEPT';
        await student.update({
            reviewStage: nextStage,
            reviewedBy: req.user.uid,
            remarks: remarks || student.remarks,
            subDeptReviewStatus: status // Backward compatibility
        });
        return res.json({ message: `Sub-department review ${status} recorded. Stage: ${nextStage}`, student });
    }

    // 2. Academic/Ops Admin Review Phase
    if (isOpsAdmin) {
        if (student.reviewStage === 'SUB_DEPT' && !stageOverride) {
            return res.status(400).json({ error: 'Institutional Guardrail: Sub-Department clearance required. Use stageOverride to bypass.' });
        }

        if (status === 'approved') {
            // Guardrail: Cannot approve student without approved center
            if (!student.centerId) {
              return res.status(400).json({ error: 'Compliance Violation: Student is not assigned to a Study Center.' });
            }
            if (!student.center || student.center.auditStatus !== 'approved') {
              return res.status(400).json({ error: `Institutional Guardrail: Associated Study Center [${student.center?.name || 'Unknown'}] must be Approved.` });
            }

            const logs = student.verificationLogs || [];
            logs.push({ step: 'Ops Review', time: new Date(), status, by: req.user.uid, remarks });

            await student.update({
              enrollStatus: 'pending_eligibility', // Moving to finance/eligibility phase
              reviewStage: 'FINANCE',
              reviewedBy: req.user.uid,
              verificationLogs: logs,
              remarks: remarks || student.remarks
            });
        } else {
            // Rejection flow
            await student.update({
              enrollStatus: 'rejected',
              reviewStage: 'SUB_DEPT', // Push back to start
              resubmittedTo: 'SUB_DEPT',
              attemptCount: (student.attemptCount || 1) + 1,
              lastRejectionReason: remarks,
              remarks: remarks || student.remarks
            });
        }
        
        return res.json({ message: `Administrative review ${status} successfully processed.`, student });
    }

    res.status(403).json({ error: 'Access denied: Review privileges required' });
  } catch (error) {
    console.error('Verify eligibility error:', error);
    res.status(500).json({ error: 'Failed to process academic review' });
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

router.post('/students/bulk-verify', verifyToken, isAcademicOrAdmin, async (req, res) => {
  try {
    const { studentIds, status, remarks } = req.body;
    
    const results = await Student.update(
      { enrollStatus: status === 'approved' ? 'pending_eligibility' : 'rejected', remarks },
      { where: { id: studentIds, enrollStatus: 'pending' } }
    );

    res.json({ message: `Bulk processed ${results[0]} students successfully` });
  } catch (error) {
    res.status(500).json({ error: 'Bulk processing protocol failure' });
  }
});

// ==========================================
// ACADEMIC SESSIONS (BATCHES)
// ==========================================

router.get('/sessions', verifyToken, isAcademicOrAdmin, async (req, res) => {
  try {
    const whereClause = {};
    if (['SUB_DEPT_ADMIN', 'openschool', 'online', 'skill', 'bvoc', 'Openschool', 'Online', 'Skill', 'Bvoc'].includes(req.user.role)) {
        whereClause.subDeptId = getSubDeptId(req.user);
    }

    const sessions = await AdmissionSession.findAll({
      where: whereClause,
      include: [
        { model: Program, attributes: ['name', 'type'] },
        { model: Department, as: 'center', attributes: ['name'] }
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

router.post('/sessions', verifyToken, isOpsOrAdmin, async (req, res) => {
  try {
    const { name, programId, centerId, startDate, endDate, maxCapacity, sessionType, academicSessionId } = req.body;
    
    // 1. Program Validation
    const program = await Program.findByPk(programId);
    if (!program) return res.status(404).json({ error: 'Program core not found' });

    const isSubDeptAdmin = ['SUB_DEPT_ADMIN', 'openschool', 'online', 'skill', 'bvoc', 'Openschool', 'Online', 'Skill', 'Bvoc'].includes(req.user.role);

    const subDeptId = ['SUB_DEPT_ADMIN', 'openschool', 'online', 'skill', 'bvoc', 'Openschool', 'Online', 'Skill', 'Bvoc'].includes(req.user.role) ? getSubDeptId(req.user) : program.subDeptId;

    if (isSubDeptAdmin && program.subDeptId !== subDeptId) {
        return res.status(403).json({ error: 'Jurisdictional Violation: Program does not belong to your academic unit.' });
    }

    // 2. Center Validation
    const center = await Department.findOne({ where: { id: centerId, type: 'center' } });
    if (!center) return res.status(404).json({ error: 'Study Center not located' });
    
    if (center.auditStatus !== 'approved') {
        return res.status(400).json({ error: `Institutional Guardrail: Center [${center.name}] must be Approved/Audited before batch generation.` });
    }

    // 3. Sub-Dept Support Validation
    const subDeptMapReverse = { 8: 'OpenSchool', 9: 'Online', 10: 'Skill', 11: 'BVoc' };
    const subDeptName = subDeptMapReverse[subDeptId];
    const mapping = await CenterSubDept.findOne({ where: { centerId, subDeptName } });
    if (!mapping) {
        return res.status(400).json({ error: `Jurisdictional Conflict: Center [${center.name}] is not accredited to support ${subDeptName} operations.` });
    }

    // 4. Status Logic
    const requiresFinance = program.type === 'Skill';
    const approvalStatus = isSubDeptAdmin ? 'DRAFT' : 'APPROVED';
    const isActive = !isSubDeptAdmin && !requiresFinance;

    const session = await AdmissionSession.create({
      name,
      programId,
      subDeptId,
      centerId,
      startDate,
      endDate,
      maxCapacity,
      financeStatus: requiresFinance ? 'pending' : 'approved',
      isActive,
      createdBySubDept: isSubDeptAdmin,
      createdBy: req.user.uid,
      approvalStatus,
      sessionType: sessionType || 'ADMISSION',
      academicSessionId: academicSessionId || null
    });

    await logAction({
       userId: req.user.uid,
       action: 'CREATE_BATCH',
       entity: 'AdmissionSession',
       entityId: session.id,
       remarks: `Initialized academic batch: ${session.name} [Status: ${approvalStatus}]`
    });

    res.status(201).json({ message: isSubDeptAdmin ? 'Batch generated as DRAFT. Please submit for institutional review.' : 'Academic batch deployed successfully.', session });
  } catch (error) {
    console.error('Session creation error:', error);
    res.status(500).json({ error: 'Failed to deploy academic batch node' });
  }
});

router.put('/sessions/:id/submit', verifyToken, isOpsOrAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const session = await AdmissionSession.findByPk(id);
        if (!session) return res.status(404).json({ error: 'Batch node not found' });

        if (session.approvalStatus !== 'DRAFT') {
            return res.status(400).json({ error: 'Protocol Conflict: Batch is already submitted or approved.' });
        }

        await session.update({ approvalStatus: 'PENDING_APPROVAL' });
        
        await logAction({
            userId: req.user.uid,
            action: 'SUBMIT_BATCH',
            entity: 'AdmissionSession',
            entityId: id,
            remarks: 'Batch submitted for institutional review'
        });

        res.json({ message: 'Batch submitted for operational review.', session });
    } catch (error) {
        res.status(500).json({ error: 'Failed to submit batch for review' });
    }
});

router.put('/sessions/:id/approve', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, remarks } = req.body; // status: 'APPROVED' or 'REJECTED'
        
        const isAcademic = req.user.role === 'academic' || req.user.role === 'org-admin' || req.user.role === 'system-admin' || req.user.role === 'OPS_ADMIN';
        const isFinance = req.user.role === 'finance';

        if (!isAcademic && !isFinance) {
            return res.status(403).json({ error: 'Access denied: Approval privileges required' });
        }

        const session = await AdmissionSession.findByPk(id, {
            include: [{ model: Program }]
        });
        if (!session) return res.status(404).json({ error: 'Batch not found' });

        if (status === 'APPROVED') {
            const isSkill = session.program?.type === 'Skill';
            
            if (isSkill && !isFinance && session.financeStatus !== 'approved') {
                return res.status(400).json({ error: 'Guardrail: Skill batches require Finance clearance first.' });
            }

            // Update status
            const updateData = { 
                approvalStatus: 'APPROVED'
            };
            
            // Skill sessions only become active if Finance has already approved or if this IS Finance approving
            if (isSkill) {
                if (isFinance) {
                    updateData.financeStatus = 'approved';
                    updateData.isActive = (session.approvalStatus === 'APPROVED' || status === 'APPROVED');
                } else {
                    updateData.isActive = (session.financeStatus === 'approved');
                }
            } else {
                updateData.isActive = true;
            }

            await session.update(updateData);
        } else {
            // Rejection logic: push back to DRAFT
            await session.update({ approvalStatus: 'DRAFT', isActive: false });
        }

        await logAction({
            userId: req.user.uid,
            action: `${status}_BATCH`,
            entity: 'AdmissionSession',
            entityId: id,
            remarks: remarks || `Batch ${status.toLowerCase()} by ${req.user.role}`
        });

        res.json({ message: `Batch ${status.toLowerCase()} successfully.`, session });
    } catch (error) {
        res.status(500).json({ error: 'Approval protocol failure' });
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
