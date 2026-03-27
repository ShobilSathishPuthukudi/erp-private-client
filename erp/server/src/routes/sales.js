import express from 'express';
import { models, sequelize } from '../models/index.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();
const { Lead, Department, Student, Payment, User, Program, AdmissionSession, ProgramFee, Invoice } = models;

// GET All Leads
router.get('/leads', authenticate, authorize('sales', 'org-admin'), async (req, res) => {
  try {
    const where = {};
    if (req.user.role === 'sales') where.assignedTo = req.user.uid;
    
    const leads = await Lead.findAll({ where, order: [['createdAt', 'DESC']] });
    res.json(leads);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CREATE Lead
router.post('/leads', authenticate, authorize('sales', 'org-admin'), async (req, res) => {
  try {
    const lead = await Lead.create({
      ...req.body,
      assignedTo: req.user.role === 'sales' ? req.user.uid : req.body.assignedTo
    });
    res.status(201).json(lead);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ASSIGN Lead Ownership
router.post('/leads/:id/assign', authenticate, authorize('org-admin', 'sales'), async (req, res) => {
  try {
    const { id } = req.params;
    const { assignedTo } = req.body;
    const lead = await Lead.findByPk(id);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    
    await lead.update({ assignedTo });
    res.json({ message: 'Ownership transferred successfully', lead });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CONVERT Lead to Study Center (Institutional Expansion Gateway)
router.post('/leads/:id/convert-to-center', authenticate, authorize('sales', 'org-admin'), async (req, res) => {
  const { id } = req.params;
  const { subDeptId, operationsId, notes } = req.body;

  try {
    const lead = await Lead.findByPk(id);
    if (!lead) return res.status(404).json({ error: 'Lead node not located' });
    if (lead.status === 'CONVERTED') return res.status(400).json({ error: 'Lead is already converted' });

    const result = await sequelize.transaction(async (t) => {
      // 1. Create Study Center record in Department table
      const center = await Department.create({
        name: lead.name,
        type: 'study-center',
        status: 'inactive', // Pending Ops Audit
        auditStatus: 'pending',
        sourceLeadId: lead.id,
        bdeId: lead.assignedTo || req.user.uid, // Store BDE ID for ownership
        adminId: subDeptId, // Assign to Sub-department
        metadata: {
          contactPerson: lead.name,
          email: lead.email,
          phone: lead.phone,
          notes: notes || lead.notes,
          operationsManagerId: operationsId, // Link to Operations
          conversionDate: new Date()
        }
      }, { transaction: t });

      // 2. Update Lead Lifecycle Status
      await lead.update({ status: 'CONVERTED' }, { transaction: t });

      // 3. (Optional) Could trigger an notification/task for Operations here

      return { center, lead };
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Lead to Center conversion failure:', error);
    res.status(500).json({ error: error.message || 'Institutional conversion protocol failed' });
  }
});

// CONVERT Lead to Student (Direct Admission) - Keeping this as secondary
router.post('/leads/:id/convert-to-student', authenticate, authorize('sales', 'org-admin'), async (req, res) => {
  const { id } = req.params;
  const { centerId, programId, sessionId, feeSchemaId } = req.body;
  // ... (Existing code for student conversion)
  try {
     const lead = await Lead.findByPk(id);
     // Re-implementing simplified student conversion
     const student = await Student.create({
        name: lead.name,
        centerId,
        programId,
        sessionId,
        feeSchemaId,
        status: 'PENDING_REVIEW'
     });
     await lead.update({ status: 'CONVERTED' });
     res.json({ student, lead });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET Sales Performance Overview
router.get('/performance', authenticate, authorize('sales', 'org-admin', 'finance'), async (req, res) => {
  try {
    const bdeId = req.user.role === 'sales' ? req.user.uid : req.query.bdeId;
    
    // Centers referred by this BDE
    const centers = await Department.findAll({
      where: { bdeId, type: 'study-center' },
      attributes: ['id', 'name', 'status', 'createdAt']
    });

    const centerIds = centers.map(c => c.id);

    // Students enrolled from these centers
    const studentCount = await Student.count({
      where: { deptId: centerIds }
    });

    // Revenue generated (Total successful payments from these students)
    const revenue = await Payment.sum('amount', {
      where: { 
        status: 'success',
        studentId: await Student.findAll({ 
            where: { deptId: centerIds }, 
            attributes: ['id'] 
        }).then(students => students.map(s => s.id))
      }
    });

    res.json({
      centerCount: centers.length,
      studentCount,
      totalRevenue: revenue || 0,
      centers: centers.map(c => ({
        ...c.dataValues,
        revenue: 0 
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET Conversion Options (Sub-Depts & Ops Managers)
router.get('/conversion-options', authenticate, authorize('sales', 'org-admin'), async (req, res) => {
  try {
    const subDepts = await Department.findAll({
      where: { type: ['BVoc', 'Skill', 'OpenSchool', 'Online'] }, // Actual sub-dept types
      attributes: ['id', 'name']
    });

    const opsManagers = await User.findAll({
      where: { role: 'operations' },
      attributes: ['uid', 'name']
    });

    res.json({ subDepts, opsManagers });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch institutional conversion options' });
  }
});

// GET unique referral code for current BDE
router.get('/referral-code', authenticate, authorize('sales'), async (req, res) => {
  try {
    let user = await User.findByPk(req.user.uid);
    if (!user.referralCode) {
      user.referralCode = `BDE-${user.name.substring(0, 3).toUpperCase()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      await user.save();
    }
    res.json({ referralCode: user.referralCode });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
