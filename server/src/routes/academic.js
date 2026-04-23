import { applyExecutiveScope } from '../middleware/visibility.js';
import { models, sequelize } from '../models/index.js';
import { Op } from 'sequelize';
import { verifyToken, isAcademicOrAdmin, isOpsOrAdmin, isArchitectureAdmin } from '../middleware/verifyToken.js';
import validate from '../middleware/validate.js';
import { universitySchema, programSchema } from '../lib/schemas.js';
import { logAction } from '../lib/audit.js';
import express from 'express';
import erpEvents from '../lib/events.js';
import { checkPermission, checkPermissionOrRole } from '../middleware/rbac.js';
import {
  getSubDepartmentNameAliases,
  normalizeInstitutionRoleName,
  normalizeSubDepartmentName,
} from '../config/institutionalStructure.js';
import { syncProgramLifecycle, syncUniversityLifecycle } from '../utils/academicLifecycle.js';
import { clearNotifications, createNotification } from './notifications.js';

const router = express.Router();
const { Department, Program, Student, ProgramFee, User, AdmissionSession, CredentialRequest, ProgramOffering, Exam, Mark, Result, Payment, Subject, Module, CenterSubDept, CenterProgram, AcademicActionRequest, Lead, Invoice, EMI, ChangeRequest } = models;

const LEGACY_SUB_DEPARTMENT_IDS = {
  'Open School': 8,
  'Online': 9,
  'Skill': 10,
  'BVoc': 11,
};

const getLegacySubDeptId = (input) => {
  if (!input) return null;
  const unitStr = (typeof input === 'string' ? input : (input.subDepartment || input.role || '')).toLowerCase();
  if (unitStr.includes('open school')) return 8;
  if (unitStr.includes('online')) return 9;
  if (unitStr.includes('skill')) return 10;
  if (unitStr.includes('bvoc')) return 11;
  return null;
};

/**
 * GAP-7: Automated Financial Logic Provisioning
 * Synchronizes ProgramFee records based on Academic paymentStructure selections.
 */
async function autoSeedFees(program, userUid) {
  const { id: programId, name: programName, totalFee, paymentStructure, tenure, duration } = program;
  const structures = Array.isArray(paymentStructure) ? paymentStructure : [];
  
  for (const type of structures) {
    const rawType = type.toLowerCase().trim();
    let schemaType = 'semester';
    let installments = [];
    let schemaName = `${type} Plan`;

    if (rawType.includes('semester')) {
      schemaType = 'semester';
      schemaName = 'Semester Plan';
      const semCount = Math.max(1, Math.floor(duration / 6));
      const amtPerSem = totalFee / semCount;
      for (let i = 1; i <= semCount; i++) {
        installments.push({ label: `Semester ${i} Fee`, amount: parseFloat(amtPerSem.toFixed(2)) });
      }
    } else if (rawType.includes('yearly') || rawType.includes('year')) {
      schemaType = 'yearly';
      schemaName = 'Yearly Plan';
      const yearCount = Math.max(1, Math.floor(duration / 12));
      const amtPerYear = totalFee / yearCount;
      for (let i = 1; i <= yearCount; i++) {
        installments.push({ label: `Year ${i} Fee`, amount: parseFloat(amtPerYear.toFixed(2)) });
      }
    } else if (rawType.includes('emi') || rawType.includes('custom') || rawType.includes('installment') || rawType.includes('monthly')) {
      schemaType = 'emi';
      // Use tenure if provided, otherwise fallback to duration for monthly plans
      const t = (tenure && tenure > 0) ? tenure : (rawType.includes('monthly') ? duration : 1);
      
      schemaName = rawType.includes('monthly') ? 'Monthly Plan' : `${t} Months EMI Plan`;
      const amtPerInst = totalFee / t;
      for (let i = 1; i <= t; i++) {
        installments.push({ label: `Installment ${i}`, amount: parseFloat(amtPerInst.toFixed(2)) });
      }
    }

    if (installments.length > 0) {
      // Check if a similarly named schema already exists to prevent duplicate seeding on updates
      const existing = await ProgramFee.findOne({ 
        where: { programId, name: schemaName, isActive: true } 
      });
      
      if (!existing) {
        await ProgramFee.create({
          programId: program.id,
          name: schemaName,
          isActive: true,
          version: 1,
          schema: {
            type: schemaType,
            installments
          }
        });
      }
    }
  }

  // Always ensure a "FULL" payment plan (Default) if totalFee exists
  if (totalFee > 0) {
    const existingDefault = await ProgramFee.findOne({ 
      where: { programId: program.id, name: 'Default Fee Structure' } 
    });

    if (!existingDefault) {
      await ProgramFee.create({
        programId: program.id,
        name: 'Default Fee Structure',
        isActive: true,
        isDefault: true,
        version: 1,
        schema: {
          type: 'full',
          installments: [{ label: 'Full Program Fee', amount: totalFee }]
        }
      });
    }
  }
}

const getSubDeptId = (input) => {
  if (!input) return null;
  if (typeof input !== 'string' && (input.deptId || input.departmentId)) {
    return input.deptId || input.departmentId;
  }
  return getLegacySubDeptId(input);
};

const getSubDeptScopeIds = (input) => {
  const ids = [];
  const primaryId = getSubDeptId(input);
  const legacyId = getLegacySubDeptId(input);

  [primaryId, legacyId]
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0)
    .forEach((value) => {
      if (!ids.includes(value)) ids.push(value);
    });

  return ids;
};

const resolveSubDepartmentScopeIds = async (identifier) => {
  if (identifier === null || identifier === undefined || identifier === '') return [];

  const numericId = Number(identifier);
  const ids = [];
  let canonicalName = null;

  if (Number.isInteger(numericId) && numericId > 0) {
    ids.push(numericId);
    const department = await Department.findByPk(numericId, { attributes: ['id', 'name'] });
    if (department?.name) {
      canonicalName = normalizeSubDepartmentName(department.name);
    }
  } else {
    canonicalName = normalizeSubDepartmentName(String(identifier));
  }

  if (canonicalName && LEGACY_SUB_DEPARTMENT_IDS[canonicalName]) {
    ids.push(LEGACY_SUB_DEPARTMENT_IDS[canonicalName]);

    const aliases = getSubDepartmentNameAliases(canonicalName);
    const matchingDepartments = await Department.findAll({
      where: { name: { [Op.in]: aliases } },
      attributes: ['id'],
      raw: true
    });

    matchingDepartments.forEach(({ id }) => {
      if (Number.isInteger(id) && id > 0) ids.push(id);
    });
  }

  return [...new Set(ids)];
};

// ==========================================
// ACADEMIC ACTION REQUESTS (GATED OPS)
// ==========================================

router.post('/request-action', verifyToken, isAcademicOrAdmin, async (req, res) => {
  try {
    const { entityType, entityId, actionType, proposedData, reason } = req.body;
    
    const request = await AcademicActionRequest.create({
      entityType,
      entityId,
      actionType,
      proposedData,
      reason,
      requesterId: req.user.uid,
      status: 'pending'
    });

    await logAction({
       userId: req.user.uid,
       action: `REQUEST_${actionType}`,
       entity: entityType,
       details: `Requested ${actionType} for ${entityType} ID: ${entityId}. Reason: ${reason}`,
       module: 'Academic'
    });

    res.status(201).json({ message: 'Request submitted for Institutional/Finance review.', request });
  } catch (error) {
    console.error('Action Request Error:', error);
    res.status(500).json({ error: 'Failed to synchronize action request' });
  }
});

// ==========================================
// REFERRAL OVERSIGHT (SALES SYNC)
// ==========================================

router.get('/referrals', verifyToken, isOpsOrAdmin, async (req, res) => {
  try {
    const [centers, leads] = await Promise.all([
      Department.findAll({
        where: { 
          type: { [Op.in]: ['partner-center', 'partner center', 'partner centers', 'study-center', 'Study centers', 'study centers'] },
          bdeId: { [Op.ne]: null }
        },
        include: [
          { model: User, as: 'referringBDE', attributes: ['name', 'email'] },
          { model: Lead, as: 'sourceLead', attributes: ['name', 'email', 'phone'] },
          { model: User, as: 'admin', attributes: ['name', 'email'] }
        ]
      }),
      Lead.findAll({
        where: { 
          bdeId: { [Op.ne]: null },
          status: { [Op.ne]: 'CONVERTED' } // Only see active leads, converted ones are departments
        },
        include: [{ model: User, as: 'referrer', attributes: ['name', 'email'] }]
      })
    ]);

    res.json({ centers, leads });
  } catch (error) {
    console.error('Referral Fetch Error:', error);
    res.status(500).json({ error: 'Failed to synchronize referral telemetry' });
  }
});

router.get('/action-requests', verifyToken, isOpsOrAdmin, async (req, res) => {
  try {
    const requests = await AcademicActionRequest.findAll({
      where: { requesterId: req.user.uid },
      order: [['createdAt', 'DESC']],
      include: [
        { model: User, as: 'requester', attributes: ['name', 'avatar'] }
      ]
    });
    res.json(requests);
  } catch (error) {
    console.error('[ACADEMIC] Fetch Action Requests Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch institutional action requests' });
  }
});

// ==========================================
// TELEMETRY & DASHBOARD STATS
// ==========================================

router.get('/stats', verifyToken, isAcademicOrAdmin, applyExecutiveScope, async (req, res) => {
  try {
    const { restricted, filter: visibilityFilter } = req.visibility;
    const subDeptAdminRoles = ['SUB_DEPT_ADMIN', 'Open School Admin', 'Online Admin', 'Skill Admin', 'BVoc Admin', 'Openschool', 'Online', 'Skill', 'Bvoc'];
    const isSubDeptAdmin = subDeptAdminRoles.includes(normalizeInstitutionRoleName(req.user.role));
    const scopeIds = getSubDeptScopeIds(req.user);
    const hasScopedIds = isSubDeptAdmin && scopeIds.length > 0;
    const sqlScope = hasScopedIds ? scopeIds.join(',') : '';

    const totalUniversities = await Department.count({ 
      where: { type: 'universities', ...visibilityFilter } 
    });
    const activePrograms = await Program.count({ 
      where: { 
        ...(hasScopedIds ? { subDeptId: { [Op.in]: scopeIds } } : {}),
        ...visibilityFilter
      } 
    });
    const pendingReviews = await Student.count({ 
      where: { 
        [Op.or]: [
          { status: 'PENDING_REVIEW' },
          { enrollStatus: { [Op.in]: ['pending', 'pending_ops', 'pending_subdept'] } }
        ],
        ...(hasScopedIds ? { subDepartmentId: { [Op.in]: scopeIds } } : {}),
        ...visibilityFilter
      } 
    });
    
    // Revenue isolation
    const paymentsRow = await Payment.findAll({
      attributes: [[sequelize.fn('SUM', sequelize.col('amount')), 'total']],
      where: {
        ...(hasScopedIds ? {
          studentId: { [Op.in]: sequelize.literal(`(SELECT id FROM students WHERE subDepartmentId IN (${sqlScope}))`) }
        } : {}),
        ...visibilityFilter
      },
      raw: true
    });
    const revenue = paymentsRow[0]?.total || 0;

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

router.get('/onboarding/stats', verifyToken, isAcademicOrAdmin, applyExecutiveScope, async (req, res) => {
  try {
    const { filter: visibilityFilter } = req.visibility;
    const subDeptAdminRoles = ['SUB_DEPT_ADMIN', 'Open School Admin', 'Online Admin', 'Skill Admin', 'BVoc Admin', 'Openschool', 'Online', 'Skill', 'Bvoc'];
    const isSubDeptAdmin = subDeptAdminRoles.includes(normalizeInstitutionRoleName(req.user.role));
    const scopeIds = getSubDeptScopeIds(req.user);

    // 1. Center Verification Stats (Canonical Mapping)
    const centersRaw = await Department.findAll({
      attributes: [
        [sequelize.literal(`
          CASE 
            WHEN auditStatus = 'pending' THEN 'PENDING_AUDIT'
            WHEN auditStatus = 'PENDING_FINANCE' OR status = 'staged' THEN 'PENDING_FINANCE'
            WHEN auditStatus = 'approved' OR status = 'active' THEN 'APPROVED'
            WHEN auditStatus = 'rejected' OR status = 'inactive' THEN 'REJECTED'
            ELSE status
          END
        `), 'canonical_status'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: {
        type: { [Op.in]: ['partner-center', 'partner center', 'partner centers', 'study-center', 'Study centers', 'study centers'] },
        ...visibilityFilter
      },
      group: ['canonical_status'],
      raw: true
    });

    // 2. Student Verification Stats (Canonical Mapping for backward compatibility)
    const studentsRaw = await Student.findAll({
      attributes: [
        [sequelize.literal(`
          CASE 
            WHEN status IN ('PENDING_REVIEW', 'OPS_APPROVED') OR enrollStatus IN ('pending', 'pending_ops', 'pending_subdept') THEN 'PENDING_REVIEW'
            WHEN status IN ('FINANCE_PENDING', 'PAYMENT_VERIFIED') OR enrollStatus = 'pending_finance' THEN 'FINANCE_PENDING'
            WHEN status IN ('ENROLLED', 'FINANCE_APPROVED') OR enrollStatus IN ('enrolled', 'active') THEN 'ENROLLED'
            WHEN status = 'REJECTED' OR enrollStatus IN ('rejected', 'rejected_subdept') THEN 'REJECTED'
            ELSE status
          END
        `), 'canonical_status'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: { 
        [Op.or]: [
          { status: { [Op.ne]: 'DRAFT' } },
          { enrollStatus: { [Op.and]: [{ [Op.ne]: 'draft' }, { [Op.ne]: null }] } }
        ],
        ...(isSubDeptAdmin && scopeIds.length > 0 ? { subDepartmentId: { [Op.in]: scopeIds } } : {}),
        ...visibilityFilter
      },
      group: ['canonical_status'],
      raw: true
    });

    // 3. Recent Transitions (Traceability)
    const recentActivity = await Student.findAll({
      attributes: ['name', 'status', 'reviewedBy', 'reviewedAt', 'reviewStage'],
      include: [{ 
        model: Department, 
        as: 'center', 
        attributes: ['name'],
        required: false 
      }],
      where: { 
        status: { [Op.ne]: 'DRAFT' },
        ...(isSubDeptAdmin && scopeIds.length > 0 ? { subDepartmentId: { [Op.in]: scopeIds } } : {}),
        ...visibilityFilter
      },
      order: [['updatedAt', 'DESC']],
      limit: 10,
      raw: true,
      nest: true
    });

    // 4. Recent Center Onboarding (Traceability)
    const recentCenters = await Department.findAll({
      attributes: ['name', 'status', 'auditStatus', 'centerStatus', 'updatedAt'],
      where: {
        type: { [Op.in]: ['partner-center', 'partner center', 'partner centers', 'study-center', 'Study centers', 'study centers'] },
        status: { [Op.ne]: 'inactive' }
      },
      order: [['updatedAt', 'DESC']],
      limit: 10,
      raw: true
    });

    res.json({
      centers: centersRaw.map(c => ({ status: c.canonical_status, count: c.count })),
      students: studentsRaw.map(s => ({ status: s.canonical_status, count: s.count })),
      recentActivity: recentActivity || [],
      recentCenters: recentCenters || []
    });
  } catch (error) {
    console.error('[ACADEMIC] Onboarding Stats Error:', error);
    res.status(500).json({ error: 'Failed to fetch onboarding telemetry' });
  }
});

// ==========================================
// UNIVERSITIES (Departments with type='university')
// ==========================================

router.get('/universities', verifyToken, isAcademicOrAdmin, applyExecutiveScope, async (req, res) => {
  try {
    const { filter: visibilityFilter } = req.visibility;
    const unisRaw = await Department.findAll({
      where: { type: 'universities', ...visibilityFilter },
      attributes: ['id'],
      raw: true
    });

    // JIT Sync: Ensure all university statuses are aligned with their program data
    for (const uni of unisRaw) {
      await syncUniversityLifecycle(uni.id);
    }

    const unis = await Department.findAll({
      where: { type: 'universities', ...visibilityFilter },
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
      attributes: {
        include: [
          [sequelize.literal(`(SELECT COUNT(*) FROM programs WHERE programs.universityId = department.id)`), 'totalPrograms'],
          ['logo', 'logoUrl']
        ]
      },
      include: [
        { model: Program, attributes: ['id', 'name', 'type', 'status', 'duration'] }
      ]
    });
    if (!uni || uni.type !== 'universities') return res.status(404).json({ error: 'University not found' });
    res.json(uni);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch university details' });
  }
});

router.post('/universities', verifyToken, checkPermissionOrRole('ACAD_UNI_SEED', 'create', ['Academic Operations Admin']), validate(universitySchema), async (req, res) => {
  try {
    const { name, shortName, status, accreditation, websiteUrl, affiliationDoc } = req.body;
    const trimmedName = typeof name === 'string' ? name.trim() : name;
    const existing = await Department.findOne({
      where: sequelize.and(
        { type: 'universities' },
        sequelize.where(sequelize.fn('LOWER', sequelize.col('name')), (trimmedName || '').toLowerCase())
      )
    });
    if (existing) {
      return res.status(409).json({ error: 'A university with this name already exists (case-insensitive).' });
    }
    const uni = await Department.create({
      name: trimmedName,
      shortName,
      type: 'universities',
      adminId: req.user.uid,
      status: status || 'proposed',
      accreditation,
      websiteUrl,
      affiliationDoc
    });
    await logAction({
       userId: req.user.uid,
       action: 'CREATE',
       entity: 'University',
       details: `Established university branch: ${uni.name} in Proposed state`,
       module: 'Academic'
    });

    res.status(201).json(uni);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create university' });
  }
});

router.put('/universities/:id', verifyToken, checkPermissionOrRole('ACAD_UNI_SEED', 'update', ['Academic Operations Admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, shortName, status, accreditation, websiteUrl, affiliationDoc, email, phone, address, logoUrl } = req.body;
    const uni = await Department.findOne({ where: { id, type: 'universities' } });
    if (!uni) return res.status(404).json({ error: 'University not found' });

    // Governance Guard: Only allow branding/contact updates for non-proposed statuses
    const isGovernanceUpdate = (name && name !== uni.name) || 
                               (shortName && shortName !== uni.shortName) || 
                               (status && status !== uni.status);
    
    if (uni.status !== 'proposed' && isGovernanceUpdate) {
      return res.status(400).json({
        error: 'Governance Error: Core institutional fields (Name, ShortName, Status) can only be modified in the PROPOSED state.'
      });
    }

    const trimmedName = typeof name === 'string' ? name.trim() : name;
    if (trimmedName && trimmedName !== uni.name) {
      const clash = await Department.findOne({
        where: sequelize.and(
          { type: 'universities', id: { [Op.ne]: id } },
          sequelize.where(sequelize.fn('LOWER', sequelize.col('name')), trimmedName.toLowerCase())
        )
      });
      if (clash) {
        return res.status(409).json({ error: 'Another university with this name already exists (case-insensitive).' });
      }
    }

    await uni.update({ 
      name: trimmedName || uni.name, 
      shortName: shortName || uni.shortName, 
      status: status || uni.status, 
      accreditation: accreditation || uni.accreditation, 
      websiteUrl: websiteUrl || uni.websiteUrl, 
      affiliationDoc: affiliationDoc || uni.affiliationDoc,
      email: email || uni.email,
      phone: phone || uni.phone,
      address: address || uni.address,
      logo: logoUrl || uni.logo
    });
    res.json(uni);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update university' });
  }
});

router.delete('/universities/:id', verifyToken, isArchitectureAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const uni = await Department.findOne({ where: { id, type: 'universities' } });
    if (!uni) return res.status(404).json({ error: 'University not found' });

    // Status Guard: Only proposed universities can be eradicated
    if (uni.status !== 'proposed' && uni.status !== 'draft') {
      return res.status(400).json({ 
        error: 'Compliance Violation: Persistent university records cannot be terminated. Status must be PROPOSED or DRAFT.' 
      });
    }

    await uni.destroy();
    res.json({ message: 'University records permanently revoked.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to execute deletion protocol.' });
  }
});

// ==========================================
// CENTERS (Departments with type='center')
// ==========================================

router.get('/centers', verifyToken, isAcademicOrAdmin, applyExecutiveScope, async (req, res) => {
  try {
    const { restricted, filter: visibilityFilter } = req.visibility;
    const rolesWithIsolation = ['SUB_DEPT_ADMIN', 'Open School Admin', 'Online Admin', 'Skill Admin', 'BVoc Admin', 'Openschool', 'Online', 'Skill', 'Bvoc'];
    const isIsolated = rolesWithIsolation.includes(normalizeInstitutionRoleName(req.user.role));
    const scopeIds = getSubDeptScopeIds(req.user);
    const sqlScope = scopeIds.join(',');

    const { status } = req.query;
    const whereClause = { 
      type: { [Op.in]: ['partner-center', 'partner center', 'partner centers', 'study-center', 'Study centers', 'study centers'] },
      ...(status ? { status } : {}),
      ...visibilityFilter
    };
    
    // Multi-Sub-Dept Visibility: A center is visible if it has at least one program in the admin's unit
    if (isIsolated && scopeIds.length > 0) {
      whereClause.id = {
        [Op.in]: sequelize.literal(`(SELECT DISTINCT centerId FROM center_programs WHERE subDeptId IN (${sqlScope}) AND isActive = true)`)
      };
    }

    const centers = await Department.findAll({
      where: whereClause,
      attributes: ['id', 'name', 'status', 'description', 'logo', 'shortName', 'auditStatus']
    });
    res.json(centers);
  } catch (error) {
    console.error('Fetch centers error:', error);
    res.status(500).json({ error: 'Failed to fetch jurisdictional center roster' });
  }
});
// ==========================================
// ACADEMIC PROGRAMS
router.get('/programs', verifyToken, isAcademicOrAdmin, applyExecutiveScope, async (req, res) => {
  try {
    const { restricted, filter: visibilityFilter } = req.visibility;
    const { subDeptId } = req.query;
    const whereClause = { ...visibilityFilter };
    
    if (['SUB_DEPT_ADMIN', 'Open School Admin', 'Online Admin', 'Skill Admin', 'BVoc Admin'].includes(normalizeInstitutionRoleName(req.user.role))) {
      const scopeIds = getSubDeptScopeIds(req.user);
      if (scopeIds.length > 0) {
        whereClause.subDeptId = { [Op.in]: scopeIds };
      }
    } else {
      const requestedScopeIds = await resolveSubDepartmentScopeIds(subDeptId);
      if (requestedScopeIds.length > 0) {
        whereClause.subDeptId = { [Op.in]: requestedScopeIds };
      }
    }

    const programs = await Program.findAll({
      where: whereClause,
      include: [
        { model: Department, as: 'university', attributes: ['id', 'name', 'shortName'] },
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
        { model: Department, as: 'university', attributes: ['id', 'name', 'shortName'] },
        { model: ProgramFee, as: 'fees', where: { isActive: true }, required: false },
        { model: Student, attributes: ['id', 'name', 'enrollStatus'] },
        { 
            model: ProgramOffering, 
            as: 'offeringCenters',
            include: [{ model: Department, as: 'center', attributes: ['id', 'name', 'shortName'] }]
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

router.post('/programs', verifyToken, checkPermissionOrRole('ACAD_PROG_ENG', 'create', ['Academic Operations Admin']), validate(programSchema), async (req, res) => {
  try {
    const { name, shortName, universityId, duration, type, intakeCapacity, totalFee, baseFee, taxPercentage, paymentStructure, totalCredits, tenure } = req.body;
    const trimmedName = typeof name === 'string' ? name.trim() : name;
    const existingProgram = await Program.findOne({
      where: sequelize.where(sequelize.fn('LOWER', sequelize.col('name')), (trimmedName || '').toLowerCase())
    });
    if (existingProgram) {
      return res.status(409).json({ error: 'A program with this name already exists (case-insensitive).' });
    }

    const PROGRAM_TYPE_TO_SUB_DEPT = {
      'open school': 8,
      'openschool': 8,
      'online': 9,
      'skill': 10,
      'bvoc': 11,
    };
    const typeKey = String(type || '').toLowerCase().trim();
    const subDeptId = PROGRAM_TYPE_TO_SUB_DEPT[typeKey];
    if (!subDeptId) {
      return res.status(400).json({ error: `Invalid program type: ${type}. Must map to a sub-department.` });
    }

    // Calculate totalFee from baseFee and taxPercentage if provided
    const calculatedTotalFee = baseFee !== undefined && taxPercentage !== undefined 
      ? parseFloat(baseFee) * (1 + parseFloat(taxPercentage) / 100)
      : (totalFee || 0);

    const p = await Program.create({
      name: trimmedName,
      shortName,
      universityId: universityId || null,
      duration,
      type,
      subDeptId,
      intakeCapacity: intakeCapacity || 0,
      totalFee: calculatedTotalFee,
      baseFee: baseFee || 0,
      taxPercentage: taxPercentage || 18,
      paymentStructure: paymentStructure || [],
      tenure: tenure || 0,
      totalCredits: totalCredits || 0,
      status: 'draft'
    });
    await logAction({
       userId: req.user.uid,
       action: 'CREATE',
       entity: 'Program',
       details: `Configured academic program: ${p.name}`,
       module: 'Academic'
    });
    
    // Auto-provision initial fee structures
    await autoSeedFees(p, req.user.uid);

    await syncProgramLifecycle(p.id);
    await p.reload();

    res.status(201).json(p);
  } catch (error) {
    console.error('[ACADEMIC] Program Creation Error:', error);
    res.status(500).json({ 
      error: 'Failed to construct program framework',
      details: error.message 
    });
  }
});

// --- Center-Program Mapping (Phase 3) ---
router.get('/centers/:id/programs', verifyToken, isAcademicOrAdmin, async (req, res) => {
  try {
    const { id: centerId } = req.params;
    const mappings = await CenterProgram.findAll({
      where: { centerId, isActive: true },
      include: [
        { model: Program, attributes: ['id', 'name', 'type', 'duration'] },
        { model: ProgramFee, as: 'feeSchema', attributes: ['id', 'name', 'totalAmount'] }
      ]
    });
    res.json(mappings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch center-program mappings' });
  }
});

router.post('/centers/:id/map-programs', verifyToken, isAcademicOrAdmin, async (req, res) => {
  try {
    const { id: centerId } = req.params;
    const { programId, feeSchemaId } = req.body;

    const program = await Program.findByPk(programId);
    if (!program) return res.status(404).json({ error: 'Program core not found' });

    // Automatic subDeptId derivation
    const subDeptId = program.subDeptId;

    const [mapping, created] = await CenterProgram.findOrCreate({
      where: { centerId, programId },
      defaults: { feeSchemaId, subDeptId, isActive: true }
    });

    if (!created) {
      await mapping.update({ feeSchemaId, subDeptId, isActive: true });
    }

    // Trigger University & Program Status: Active (Selection Trigger)
    if (program.universityId) {
        await Department.update({ status: 'active' }, { where: { id: program.universityId, type: 'universities' } });
        await Program.update({ status: 'active' }, { where: { id: program.id } });
    }

    res.status(201).json(mapping);
  } catch (error) {
    console.error('Center-Program mapping error:', error);
    res.status(500).json({ error: 'Failed to synchronize center-program mapping' });
  }
});

router.post('/centers/:id/register', verifyToken, isAcademicOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const center = await Department.findByPk(id);
    if (!center) return res.status(404).json({ error: 'Center node not found' });
    
    if (center.centerStatus !== 'APPROVED_BY_CENTER') {
       return res.status(400).json({ error: 'Governance Error: Center has not yet accepted the institutional proposal.' });
    }

    await center.update({ centerStatus: 'REGISTERED' });
    
    await models.AuditLog.create({
        entity: 'Department',
        action: 'REGISTER_CENTER',
        userId: req.user.uid,
        before: { centerStatus: 'APPROVED_BY_CENTER' },
        after: { centerStatus: 'REGISTERED' },
        module: 'Operations'
    });

    res.json({ message: 'Center successfully registered. Proceed to program mapping.' });
  } catch (error) {
    res.status(500).json({ error: 'Center registration failed' });
  }
});

router.put('/programs/:id', verifyToken, checkPermissionOrRole('ACAD_PROG_ENG', 'update', ['Academic Operations Admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { subDeptId } = req.body;
    const p = await Program.findByPk(id);
    if (!p) return res.status(404).json({ error: 'Program core not found' });
    if (p.status !== 'draft') {
      return res.status(400).json({
        error: 'Governance Error: Only programs in DRAFT state can be edited.'
      });
    }

    if (subDeptId && subDeptId !== p.subDeptId) {
      const studentCount = await Student.count({ where: { programId: id } });
      if (studentCount > 0) {
        return res.status(400).json({ error: 'Governance Error: Cannot reassign Sub-Department while students are enrolled in this program.' });
      }
    }

    const incomingName = typeof req.body.name === 'string' ? req.body.name.trim() : req.body.name;
    if (incomingName) {
      const clash = await Program.findOne({
        where: sequelize.and(
          { id: { [Op.ne]: id } },
          sequelize.where(sequelize.fn('LOWER', sequelize.col('name')), incomingName.toLowerCase())
        )
      });
      if (clash) {
        return res.status(409).json({ error: 'Another program with this name already exists (case-insensitive).' });
      }
    }

    const { status, ...updateData } = req.body;
    if (incomingName) updateData.name = incomingName;

    // Recalculate totalFee if baseFee or taxPercentage is updated
    let calculatedTotalFee = updateData.totalFee;
    if (updateData.baseFee !== undefined || updateData.taxPercentage !== undefined) {
      const base = updateData.baseFee !== undefined ? updateData.baseFee : p.baseFee;
      const tax = updateData.taxPercentage !== undefined ? updateData.taxPercentage : p.taxPercentage;
      calculatedTotalFee = parseFloat(base) * (1 + parseFloat(tax) / 100);
    }

    const previousUniversityId = p.universityId;

    await p.update({ 
      ...updateData,
      name: updateData.name || p.name,
      shortName: updateData.shortName !== undefined ? updateData.shortName : p.shortName,
      universityId: updateData.universityId || p.universityId, 
      subDeptId: updateData.subDeptId || p.subDeptId,
      totalFee: calculatedTotalFee !== undefined ? calculatedTotalFee : p.totalFee,
      baseFee: updateData.baseFee !== undefined ? updateData.baseFee : p.baseFee,
      taxPercentage: updateData.taxPercentage !== undefined ? updateData.taxPercentage : p.taxPercentage,
      paymentStructure: updateData.paymentStructure || p.paymentStructure,
      tenure: updateData.tenure !== undefined ? updateData.tenure : p.tenure,
      totalCredits: updateData.totalCredits !== undefined ? updateData.totalCredits : p.totalCredits
    });

    // Synchronize fee structures on update in case payment structures were toggled
    await autoSeedFees(p, req.user.uid);

    await syncProgramLifecycle(p.id);
    if (previousUniversityId && previousUniversityId !== p.universityId) {
      await syncUniversityLifecycle(previousUniversityId);
    }
    await p.reload();

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

    // Status Guard: Only draft/staged programs can be wiped
    const allowed = ['draft', 'staged'];
    if (!allowed.includes(p.status?.toLowerCase())) {
        return res.status(400).json({ 
            error: 'Institutional Guardrail: Program deletion restricted. Active frameworks must be retained for data integrity.' 
        });
    }

    const universityId = p.universityId;
    await p.destroy();
    
    if (universityId) {
      await syncUniversityLifecycle(universityId);
    }

    res.json({ message: 'Program safely sunsetted.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to execute deletion.' });
  }
});

// ==========================================
// ACADEMIC STUDENT REVIEW & MARKS ENTRY
// ==========================================

router.get('/students', verifyToken, isAcademicOrAdmin, applyExecutiveScope, async (req, res) => {
  try {
    const { status, programId, stage, subDeptId } = req.query;
    const whereClause = {};
    if (status) {
      const statuses = status.split(',');
      const validStatuses = ['PENDING_REVIEW', 'OPS_APPROVED', 'FINANCE_PENDING', 'FINANCE_APPROVED', 'REJECTED', 'ENROLLED', 'APPROVED', 'DRAFT'];
      const legacyMap = {
        'PENDING_REVIEW': ['pending', 'pending_ops', 'pending_subdept'],
        'OPS_APPROVED': ['ops_approved'],
        'FINANCE_PENDING': ['pending_finance', 'pending_eligibility', 'finance_approved'],
        'FINANCE_APPROVED': ['finance_approved'],
        'REJECTED': ['rejected', 'rejected_subdept', 'rejected_finance'],
        'ENROLLED': ['enrolled', 'active'],
        'APPROVED': ['enrolled', 'active']
      };

      const statusFilters = statuses.filter(s => validStatuses.includes(s));

      if (statusFilters.length > 0) {
        // Inclusive Filtering: Match either standard ENUM status OR legacy enrollStatus variants
        // Also include DRAFT students whose enrollStatus matches (e.g. enrollStatus='pending' with status='DRAFT')
        const orConditions = statusFilters.flatMap(s => {
          const conditions = [{ status: s }];
          if (legacyMap[s]) {
            legacyMap[s].forEach(variant => conditions.push({ enrollStatus: variant }));
          }
          return conditions;
        });
        whereClause[Op.or] = orConditions;
      } else {
        whereClause.enrollStatus = status;
      }
    } else {
      // No status filter: default to only submitted (non-draft) candidates
      whereClause.status = { [Op.ne]: 'DRAFT' };
    }
    if (programId) whereClause.programId = programId;
    if (stage) whereClause.reviewStage = stage;
    const requestedScopeIds = await resolveSubDepartmentScopeIds(subDeptId);
    if (requestedScopeIds.length > 0) {
      whereClause.subDepartmentId = { [Op.in]: requestedScopeIds };
    }

    // Isolation: Sub-Dept Admin only sees their unit's students
    if (['SUB_DEPT_ADMIN', 'Open School Admin', 'Online Admin', 'Skill Admin', 'BVoc Admin', 'Openschool', 'Online', 'Skill', 'Bvoc'].includes(normalizeInstitutionRoleName(req.user.role))) {
      const scopeIds = getSubDeptScopeIds(req.user);
      if (scopeIds.length > 0) {
        whereClause.subDepartmentId = { [Op.in]: scopeIds };
      }
    }

    // CEO Visibility Guard
    const { restricted, filter: visibilityFilter } = req.visibility;
    const finalWhere = { ...whereClause, ...visibilityFilter };

    const students = await Student.findAll({
      where: finalWhere,
      include: [
        { model: Program, attributes: ['id', 'name', 'subDeptId'] },
        // Use unscoped() to prevent Department's defaultScope WHERE from converting LEFT JOINs
        // into effective INNER JOINs (students with NULL centerId would otherwise be excluded)
        { model: Department.unscoped(), as: 'center', attributes: ['id', 'name'], required: false },
        { model: Department.unscoped(), as: 'subDepartment', attributes: ['id', 'name'], required: false }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch academic candidates' });
  }
});

router.get('/students/:id', verifyToken, isAcademicOrAdmin, applyExecutiveScope, async (req, res) => {
  try {
    const studentId = Number(req.params.id);
    if (!studentId) {
      return res.status(400).json({ error: 'Invalid student id' });
    }

    const visibilityFilter = req.visibility?.studentFilter || {};
    const student = await Student.findOne({
      where: {
        id: studentId,
        ...visibilityFilter
      },
      include: [
        {
          model: Program,
          attributes: ['id', 'name', 'type', 'duration', 'universityId'],
          include: [{ model: Department.unscoped(), as: 'university', attributes: ['id', 'name'], required: false }]
        },
        { model: Department.unscoped(), as: 'center', attributes: ['id', 'name'], required: false },
        { model: Department.unscoped(), as: 'subDepartment', attributes: ['id', 'name'], required: false },
        {
          model: ProgramFee,
          as: 'feeSchema',
          attributes: ['id', 'name', 'schema', 'version', 'isDefault'],
          required: false
        },
        {
          model: Invoice,
          as: 'activationInvoice',
          attributes: ['id', 'invoiceNo', 'amount', 'gst', 'total', 'status', 'createdAt', 'paymentId'],
          required: false
        },
        {
          model: Payment,
          as: 'payments',
          attributes: ['id', 'amount', 'mode', 'transactionId', 'receiptUrl', 'status', 'verifiedBy', 'date', 'createdAt'],
          required: false
        },
        {
          model: EMI,
          as: 'emis',
          attributes: ['id', 'installmentNo', 'dueDate', 'amount', 'status', 'paidAt', 'remarks'],
          required: false
        }
      ],
      order: [
        [{ model: Payment, as: 'payments' }, 'createdAt', 'DESC'],
        [{ model: EMI, as: 'emis' }, 'installmentNo', 'ASC']
      ]
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json(student);
  } catch (error) {
    console.error('Student detail fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch student details' });
  }
});

router.put('/students/:id/verify-eligibility', verifyToken, isOpsOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;
    
    const student = await Student.findByPk(id, {
      include: [
        { model: Department, as: 'center' },
        { model: Program, attributes: ['id', 'type', 'subDeptId'] }
      ]
    });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const userRole = (req.user.role || "").toLowerCase().trim();
    console.log(`[FORENSIC] Verifying eligibility for user: ${req.user.uid} with role: "${userRole}"`);

    const SUB_DEPT_ROLES = ["sub_dept_admin", "open school admin", "online department admin", "skill department admin", "bvoc department admin", "openschool", "online", "skill", "bvoc"];
    const OPS_ROLES = ["academic operations admin", "organization admin", "academic operations", "operations admin"];

    const isSubDeptAdmin = SUB_DEPT_ROLES.includes(userRole);
    const isOpsAdmin = OPS_ROLES.includes(userRole);

    if (!isSubDeptAdmin && !isOpsAdmin) {
        return res.status(403).json({ error: `Access denied: Review privileges required for role [${userRole}]` });
    }

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
        if (student.reviewStage !== 'OPS' && student.reviewStage !== 'SUB_DEPT') {
            return res.status(400).json({ error: 'Governance Conflict: Student must be in OPS or SUB_DEPT stage for operational clearance.' });
        }

        if (!['approved', 'rejected', 'correction_requested'].includes(status)) {
            return res.status(400).json({ error: 'Validation Error: Invalid operational decision.' });
        }

        const opsNotificationRoles = [
            'Academic Operations',
            'Academic Operations Admin',
            'Academic Operations Administrator',
            'Operations Admin',
            'Operations Administrator',
            'Organization Admin'
        ];
        const opsRecipients = await User.findAll({
            where: {
                role: { [Op.in]: opsNotificationRoles },
                status: 'active'
            },
            attributes: ['uid']
        });

        const nextStage = status === 'approved' ? 'FINANCE' : 'SUB_DEPT';
        const nextStudentStatus = status === 'approved' ? 'FINANCE_PENDING' : status === 'correction_requested' ? 'DRAFT' : 'REJECTED';
        const nextEnrollStatus = status === 'approved' ? 'pending_finance' : status === 'correction_requested' ? 'correction_requested' : 'rejected';
        const decisionRemarks = remarks || student.remarks;

        await student.update({
            reviewStage: nextStage,
            status: nextStudentStatus,
            enrollStatus: nextEnrollStatus,
            reviewedBy: req.user.uid,
            reviewedAt: new Date(),
            remarks: decisionRemarks,
            lastRejectionReason: status === 'approved' ? null : decisionRemarks,
            resubmittedTo: status === 'correction_requested' ? 'SUB_DEPT' : null,
            resubmissionDate: status === 'correction_requested' ? null : student.resubmissionDate
        });

        await clearNotifications({
            userUids: opsRecipients.map((user) => user.uid),
            links: ['/dashboard/operations/pending-reviews?tab=pending'],
            messagePatterns: [
                `New Enrollment: ${student.name}:%`,
                `%${student.name}%submitted a new enrollment application for review%`
            ]
        });

        if (status === 'approved') {
            try {
                const financeRecipients = await User.findAll({
                    where: {
                        role: {
                            [Op.in]: ['Finance Admin', 'Organization Admin']
                        },
                        status: 'active'
                    }
                });

                for (const financeUser of financeRecipients) {
                    await createNotification(req.io, {
                        targetUid: financeUser.uid,
                        title: `Finance Review Required: ${student.name}`,
                        message: `Academic Operations has cleared ${student.name} for finance verification.`,
                        type: 'info',
                        link: '/dashboard/finance/approvals'
                    });
                }
            } catch (notificationError) {
                console.error('[FINANCE_NOTIFY_ERROR]:', notificationError);
            }
        }

        if (status === 'correction_requested') {
            try {
                const centerRecipientUids = new Set();

                if (student.center?.adminId) {
                    centerRecipientUids.add(student.center.adminId);
                }

                const centerUsers = await User.findAll({
                    where: {
                        status: 'active',
                        [Op.or]: [
                            { deptId: student.centerId, role: { [Op.in]: ['Partner Center', 'Partner Centers', 'partner centers'] } },
                            { uid: student.center?.adminId || null }
                        ]
                    },
                    attributes: ['uid']
                });

                for (const centerUser of centerUsers) {
                    if (centerUser?.uid) centerRecipientUids.add(centerUser.uid);
                }

                for (const targetUid of centerRecipientUids) {
                    await createNotification(req.io, {
                        targetUid,
                        title: `Correction Requested: ${student.name}`,
                        message: `Academic Operations requested corrections for ${student.name}. Review the remarks, update the record, and resubmit the application.`,
                        type: 'warning',
                        link: '/dashboard/study-center/students',
                        metadata: {
                            studentId: student.id,
                            centerId: student.centerId,
                            flow: 'student_correction_request'
                        }
                    });
                }
            } catch (notificationError) {
                console.error('[CENTER_CORRECTION_NOTIFY_ERROR]:', notificationError);
            }
        }

        await logAction({
            userId: req.user.uid,
            action: status === 'correction_requested' ? 'OPS_REQUEST_CORRECTION' : `OPS_${status.toUpperCase()}`,
            studentId: id,
            remarks: remarks
        });

        if (status === 'approved') {
            return res.json({ message: 'Operational clearance approved. Application moved to FINANCE.', student });
        }

        if (status === 'correction_requested') {
            return res.json({ message: 'Correction requested. Partner Center has been notified to revise and resubmit the application.', student });
        }

        return res.json({ message: 'Operational clearance rejected. Application closed.', student });
    }

    return res.status(400).json({ error: 'Governance Conflict: Role-to-Stage mismatch.' });
  } catch (error) {
    console.error('Eligibility Verification Logic Failure:', error);
    res.status(500).json({ error: 'Internal logic protocol failure during eligibility verification.' });
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
    const role = req.user.role?.toLowerCase().trim();
    const canonicalRole = normalizeInstitutionRoleName(req.user.role || '');
    const scopeIds = getSubDeptScopeIds(req.user);
    
    if (['SUB_DEPT_ADMIN', 'Open School Admin', 'Online Admin', 'Skill Admin', 'BVoc Admin', 'Openschool', 'Online', 'Skill', 'Bvoc'].includes(canonicalRole) && scopeIds.length > 0) {
        whereClause.subDeptId = { [Op.in]: scopeIds };
    } else if (['partner-center', 'partner center', 'partner centers'].includes(role)) {
        const centerId = req.user.deptId;
        if (centerId) {
            whereClause.centerId = centerId;
        } else {
            const center = await Department.findOne({ where: { adminId: req.user.uid, type: 'partner centers' } });
            if (center) {
                whereClause.centerId = center.id;
            } else {
                return res.json([]); // No center found for this admin
            }
        }
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

router.post('/sessions', verifyToken, checkPermission('ACAD_BATCH_INIT', 'create'), async (req, res) => {
  try {
    const { name, programId, centerId, startDate, endDate, maxCapacity, sessionType, academicSessionId } = req.body;
    
    // 1. Program Validation
    const program = await Program.findByPk(programId);
    if (!program) return res.status(404).json({ error: 'Program core not found' });

    const isSubDeptAdmin = ['SUB_DEPT_ADMIN', 'Open School Admin', 'Online Admin', 'Skill Admin', 'BVoc Admin', 'Openschool', 'Online', 'Skill', 'Bvoc'].includes(normalizeInstitutionRoleName(req.user.role));
    const scopeIds = isSubDeptAdmin ? getSubDeptScopeIds(req.user) : [];
    const subDeptId = isSubDeptAdmin ? program.subDeptId : program.subDeptId;

    if (isSubDeptAdmin && scopeIds.length > 0 && !scopeIds.includes(program.subDeptId)) {
        return res.status(403).json({ error: 'Jurisdictional Violation: Program does not belong to your academic unit.' });
    }

    // 2. Center Validation
    const center = await Department.findOne({ where: { id: centerId, type: 'partner centers' } });
    if (!center) return res.status(404).json({ error: 'Study Center not located' });
    
    if (center.auditStatus !== 'approved') {
        return res.status(400).json({ error: `Institutional Guardrail: Center [${center.name}] must be Approved/Audited before batch generation.` });
    }

    // 3. Sub-Dept Support Validation (Jurisdictional Accreditation)
    const mapping = await CenterProgram.findOne({ 
      where: { 
        centerId, 
        ...(isSubDeptAdmin && scopeIds.length > 0 ? { subDeptId: { [Op.in]: scopeIds } } : { subDeptId }), 
        isActive: true 
      } 
    });
    if (!mapping) {
        const subDeptMap = { 8: 'OpenSchool', 9: 'Online', 10: 'Skill', 11: 'BVoc' };
        return res.status(400).json({ error: `Jurisdictional Conflict: Center [${center.name}] is not accredited to support ${subDeptMap[subDeptId]} operations.` });
    }

    // 4. Uniqueness Validation
    const existing = await AdmissionSession.findOne({ where: { name, centerId } });
    if (existing) {
        return res.status(400).json({ error: 'A batch with this identity already exists at this study center.' });
    }

    // 5. Status Logic
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
        
        const isAcademic = ['Operations Admin', 'Organization Admin'].includes(req.user.role);
        const isFinance = req.user.role === 'Finance Admin';

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

    // Uniqueness validation on update
    if (name && name !== session.name) {
        const existing = await AdmissionSession.findOne({ 
            where: { 
                name, 
                centerId: session.centerId,
                id: { [Op.ne]: id }
            } 
        });
        if (existing) {
            return res.status(400).json({ error: 'The specified batch name is already in use by another node in this center.' });
        }
    }

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
      include: [{ model: Department, as: 'center', attributes: ['name', ['id', 'centerId']] }],
      order: [['createdAt', 'DESC']]
    });
    res.json(requests || []);
  } catch (error) {
    console.error("[ACADEMIC_ERROR] GET /credentials/requests failure:", error);
    res.status(500).json({ error: 'Failed to fetch reveal audit trail' });
  }
});

router.post('/credentials/request', verifyToken, isAcademicOrAdmin, async (req, res) => {
  try {
    const { centerId, remarks } = req.body;
    
    // Validate target (Must be an ACTIVE Partner Center)
    const center = await Department.findOne({ 
      where: { 
        id: centerId, 
        type: 'partner centers',
        status: 'active'
      } 
    });
    
    if (!center) return res.status(404).json({ error: 'Institutional Guardrail: Target center not found or is currently INACTIVE. Forensic reveal is restricted to active institutional nodes.' });

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
    const request = await CredentialRequest.unscoped().findByPk(req.params.id, {
      include: [
        { 
          model: Department.unscoped(), 
          as: 'center',
          include: [{ model: User.unscoped(), as: 'admin', attributes: ['email'] }] 
        }
      ]
    });

    if (!request) return res.status(404).json({ error: 'Request node not found' });
    if (request.status !== 'approved') return res.status(403).json({ error: 'Awaiting Finance clearance for reveal' });
    
    if (request.revealUntil && new Date() > new Date(request.revealUntil)) {
       return res.status(403).json({ error: 'Institutional Guardrail: 24-hour reveal window has expired. Please submit a new forensic request.' });
    }

    // PRD Rule: 60-Second Security Window
    if (!request.expiresAt) {
      return res.status(403).json({ error: 'Security protocol: Must trigger view activation first.' });
    }

    if (new Date() > new Date(request.expiresAt)) {
      return res.status(403).json({ error: 'Institutional Guardrail: Credential reveal window (60s) has expired. Please re-verify.' });
    }

    await logAction({
       userId: req.user.uid,
       action: 'SECURE_REVEAL',
       entity: 'CredentialReveal',
       details: `SENSITIVE: Credentials revealed for ${request.center.name}. IP: ${req.ip}`,
       module: 'Academic'
    });

    let loginId = request.center.admin?.email || request.center.email;

    // Fallback: If no explicit admin link or email, locate the provisioned user account for this center
    if (!loginId) {
      const provisionedUser = await User.unscoped().findOne({
        where: {
          deptId: request.centerId,
          role: { [Op.in]: ['Partner Center', 'partner centers', 'partner-center'] }
        },
        attributes: ['email', 'uid']
      });
      loginId = provisionedUser?.email || provisionedUser?.uid;
    }

    res.json({
      loginId: loginId || request.center.loginId,
      password: request.center.password // Usually this would be decrypted here
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reveal credentials from vault' });
  }
});

router.post('/credentials/:id/trigger-view', verifyToken, isAcademicOrAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const request = await CredentialRequest.findByPk(id);
        if (!request) return res.status(404).json({ error: 'Request not found.' });

        if (request.status !== 'approved') {
            return res.status(403).json({ error: 'Credential access not yet approved by Finance.' });
        }

        const now = new Date();
        const expiry = new Date(now.getTime() + 60000); // 60 seconds

        await request.update({
            viewedAt: now,
            expiresAt: expiry,
            viewedBy: req.user.uid,
            ipAddress: req.ip || request.ipAddress
        });

        await logAction({
            userId: req.user.uid,
            action: 'TRIGGER_VIEW',
            entity: 'CredentialReveal',
            details: `Visibility window activated (60s) for request #${id}.`,
            module: 'Academic'
        });

        res.json({ message: 'Security gate opened. You have 60 seconds to view credentials.', expiresAt: expiry });
    } catch (error) {
        res.status(500).json({ error: 'Failed to trigger security window.' });
    }
});

router.post('/credentials/request/:id/cancel', verifyToken, isAcademicOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const request = await CredentialRequest.findByPk(id, {
      include: [{ model: Department, as: 'center' }]
    });

    if (!request) return res.status(404).json({ error: 'Request node not located in registry' });
    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Protocol Conflict: Only pending requests can be withdrawn.' });
    }

    // Security Gate: Only the requester or an administrator can cancel
    if (request.requesterId !== req.user.uid && req.user.role !== 'Organization Admin') {
      return res.status(403).json({ error: 'Security Violation: Unauthorized to withdraw this institutional request.' });
    }

    await request.update({ status: 'cancelled' });

    await logAction({
       userId: req.user.uid,
       action: 'WITHDRAW_REQUEST',
       entity: 'CredentialReveal',
       details: `Withdrawn credential access request for center: ${request.center?.name || 'Unknown'}`,
       module: 'Academic'
    });

    res.json({ message: 'Credential reveal request successfully withdrawn.', request });
  } catch (error) {
    console.error('[ACADEMIC] Cancel Request Error:', error);
    res.status(500).json({ error: 'Failed to execute request withdrawal protocol' });
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

router.get('/center-university-change-requests', verifyToken, isOpsOrAdmin, async (req, res) => {
  try {
    const requests = await ChangeRequest.findAll({
      where: {
        requestType: 'center_university_change',
        status: { [Op.in]: ['pending_ops', 'pending_finance', 'approved', 'rejected_ops', 'rejected_finance'] }
      },
      include: [
        { model: Department, as: 'center', attributes: ['id', 'name'], required: false },
        { model: Department, as: 'currentUniversity', attributes: ['id', 'name', 'status'], required: false },
        { model: Department, as: 'requestedUniversity', attributes: ['id', 'name', 'status'], required: false },
        { model: Program, as: 'currentProgram', attributes: ['id', 'name'], required: false },
        { model: Program, as: 'requestedProgram', attributes: ['id', 'name'], required: false },
        { model: ProgramFee, as: 'requestedFeeSchema', attributes: ['id', 'name'], required: false },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.json(requests);
  } catch (error) {
    console.error('Fetch center university change requests error:', error);
    res.status(500).json({ error: 'Failed to fetch university change requests' });
  }
});

router.post('/center-university-change-requests/:id/decision', verifyToken, isOpsOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be approved or rejected' });
    }

    if (!remarks || remarks.trim().length < 12) {
      return res.status(400).json({ error: 'Operations remarks (min 12 chars) are required' });
    }

    const request = await ChangeRequest.findByPk(id, {
      include: [
        { model: Department, as: 'center', attributes: ['id', 'name', 'adminId'], required: false },
        { model: Program, as: 'currentProgram', attributes: ['id', 'name'], required: false },
        { model: Program, as: 'requestedProgram', attributes: ['id', 'name'], required: false },
      ]
    });

    if (!request) return res.status(404).json({ error: 'University change request not found' });
    if (request.status !== 'pending_ops') {
      return res.status(409).json({ error: 'Only operations-pending requests can be reviewed here' });
    }

    await request.update({
      status: status === 'approved' ? 'pending_finance' : 'rejected_ops',
      opsRemarks: remarks.trim(),
      opsApprovedBy: req.user.uid,
      opsApprovedAt: new Date(),
    });

    if (status === 'approved') {
      const financeUsers = await User.findAll({
        where: {
          role: { [Op.in]: ['Finance Admin', 'Organization Admin'] },
          status: 'active'
        },
        attributes: ['uid']
      });

      for (const financeUser of financeUsers) {
        await createNotification(req.io, {
          targetUid: financeUser.uid,
          title: `University Change Awaiting Finance: ${request.center?.name || 'Center'}`,
          message: `${request.center?.name || 'A center'} was reassigned from ${request.currentProgram?.name || 'current program'} to ${request.requestedProgram?.name || 'requested program'} by Operations and now needs finance approval.`,
          type: 'info',
          link: '/dashboard/finance/university-changes',
        });
      }
    } else {
      const centerUsers = await User.findAll({
        where: {
          status: 'active',
          [Op.or]: [
            { deptId: request.centerId, role: { [Op.in]: ['Partner Center', 'Partner Centers', 'partner centers'] } },
            request.center?.adminId ? { uid: request.center.adminId } : null
          ].filter(Boolean)
        },
        attributes: ['uid']
      });

      for (const centerUser of centerUsers) {
        await createNotification(req.io, {
          targetUid: centerUser.uid,
          title: `University Change Rejected: ${request.center?.name || 'Center'}`,
          message: `Operations rejected the requested change to ${request.requestedProgram?.name || 'the requested program'}. Review the remarks and submit a corrected request if needed.`,
          type: 'warning',
          link: '/dashboard/study-center/programs',
        });
      }
    }

    await logAction({
      userId: req.user.uid,
      action: status === 'approved' ? 'OPS_APPROVE_CENTER_UNIVERSITY_CHANGE' : 'OPS_REJECT_CENTER_UNIVERSITY_CHANGE',
      entity: 'ChangeRequest',
      details: `Operations ${status} university change request #${request.id}`,
      module: 'Academic',
      remarks: remarks.trim(),
    });

    res.json({ message: `University change request ${status} by Operations.`, request });
  } catch (error) {
    console.error('Process center university change request error:', error);
    res.status(500).json({ error: 'Failed to process university change request' });
  }
});

export default router;
