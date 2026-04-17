import express from 'express';
import { models, sequelize } from '../models/index.js';
import { Op } from 'sequelize';
import { authenticate, authorize } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';
import { checkPermission } from '../middleware/rbac.js';

const router = express.Router();
const { Lead, Department, Student, Payment, User, Referral, Program, AdmissionSession, ProgramFee, Invoice } = models;

const Center = Department; // Alias for consistency with user request

// GET All Leads
router.get('/leads', authenticate, checkPermission('SALES_LEAD_CAP', 'read'), async (req, res) => {
  try {
    const { permissionFilter } = req;
    const leads = await Lead.findAll({
      where: permissionFilter,
      include: [
        {
          model: User,
          as: 'employee',
          required: false
        },
        {
          model: Center,
          as: 'Center',
          required: false
        }
      ]
    });
    return res.json(leads || []);
  } catch (error) {
    console.error("SALES ERROR (Leads):", error);
    return res.status(500).json({
      message: error.message || "Internal Server Error"
    });
  }
});

// CREATE Lead
router.post('/leads', authenticate, checkPermission('SALES_LEAD_CAP', 'create'), async (req, res) => {
  try {
    const lead = await Lead.create({
      ...req.body,
      employeeId: req.user.uid
    });
    res.status(201).json(lead);
  } catch (error) {
    console.error("SALES ERROR (Create Lead):", error);
    return res.status(500).json({
      message: error.message || "Internal Server Error"
    });
  }
});

// GET unique referral code for current BDE
router.get('/referral-code', authenticate, checkPermission('SALES_LEAD_CAP', 'read'), async (req, res) => {
  try {
    const userId = req.user?.uid; // Using uid as per current architecture

    let code = await Referral.findOne({
      where: { userId }
    });

    if (!code) {
      // Auto-generate if not found, to avoid null crash on frontend if expected
      const user = await User.findByPk(userId);
      const newCode = `BDE-${(user?.name || 'REP').substring(0, 3).toUpperCase()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      code = await Referral.create({ userId, code: newCode });
    }

    if (code) {
      return res.json({ referralCode: code.code });
    }

    return res.json({ referralCode: null });
  } catch (error) {
    console.error("SALES ERROR (Referral):", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

// GET Sales Performance Overview
router.get('/performance', authenticate, checkPermission('SALES_LEAD_CAP', 'read'), async (req, res) => {
  try {
    const { permissionFilter } = req;
    const leads = await Lead.findAll({
      where: permissionFilter,
      attributes: ['id', 'name', 'status', 'createdAt', 'expectedValue']
    });

    const result = {
      total: leads.length,
      converted: leads.filter(l => l.status === 'CONVERTED' || l.status === 'converted').length,
      centerCount: leads.filter(l => l.status === 'CONVERTED' || l.status === 'converted').length, // Alias for UI
      studentCount: leads.length, // Placeholder logic
      totalRevenue: leads.reduce((acc, l) => acc + parseFloat(l.expectedValue || 0), 0),
      centers: leads.map(l => ({
        id: l.id,
        name: l.name,
        status: l.status,
        createdAt: l.createdAt,
        revenue: parseFloat(l.expectedValue || 0)
      }))
    };

    return res.json(result);
  } catch (error) {
    console.error("SALES ERROR (Performance):", error);
    return res.status(500).json({
      message: error.message || "Internal Server Error"
    });
  }
});

router.get('/conversion-options', authenticate, authorize(['Sales & CRM Admin', 'Organization Admin']), async (req, res) => {
  try {
    // 1. Identify Sales Departments
    const salesDepts = await Department.findAll({ 
      where: { type: 'sales' },
      attributes: ['id']
    });
    const salesDeptIds = salesDepts.map(d => d.id);

    // 2. Fetch all personnel associated with Sales (Admins + Employees/BDEs)
    const [programs, salesStaff, universities] = await Promise.all([
      Program.findAll({ 
        where: { status: { [Op.in]: ['active', 'staged'] } }, 
        attributes: ['id', 'name', 'shortName', 'type'] 
      }),
      User.findAll({ 
        where: { 
          [Op.or]: [
            { role: 'Sales & CRM Admin' },
            { deptId: { [Op.in]: salesDeptIds } }
          ],
          status: 'active'
        }, 
        attributes: ['uid', 'name', 'role'] 
      }),
      Department.findAll({ where: { type: 'universities', status: { [Op.in]: ['active', 'staged'] } }, attributes: ['id'] })
    ]);

    return res.json({
      programs: programs || [],
      salesStaff: salesStaff || [],
      hasUniversities: universities.length > 0
    });
  } catch (error) {
    console.error("SALES ERROR (Conversion Options):", error);
    return res.status(500).json({
      message: error.message || "Internal Server Error"
    });
  }
});

// CONVERT Lead to Center
router.post('/leads/:id/convert-to-center', authenticate, checkPermission('SALES_CONV', 'approve'), async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { programIds, notes, shortName } = req.body;

    const lead = await Lead.findByPk(id);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    if (!programIds || !Array.isArray(programIds) || programIds.length === 0) {
      return res.status(400).json({ error: 'Governance Violation: A center cannot be established without configuring at least one academic program and its associated university.' });
    }

    // 1. Create Department (Study Center)
    const center = await Department.create({
      name: lead.name,
      shortName: shortName || lead.name.substring(0, 5).toUpperCase(),
      type: 'partner centers',
      status: 'inactive',
      auditStatus: 'pending',
      sourceLeadId: lead.id,
      bdeId: lead.bdeId || lead.employeeId || req.user.uid, // Fallback to converting user if lead has no BDE
      metadata: {
        convertedAt: new Date(),
        conversionNotes: notes
      }
    }, { transaction });

    // 1b. Create User for Center Login (GAP-5 Ready)
    const { User: UserModel } = models;
    const centerEmail = req.body.email || lead.email || `center_${center.id}@erp.com`;
    const password = req.body.password || 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);
    const generatedUid = `CTR-${Date.now().toString().slice(-6)}-${center.id}`;

    const centerUser = await UserModel.create({
      uid: generatedUid,
      name: lead.name,
      email: centerEmail,
      password: hashedPassword,
      devPassword: password,
      role: 'Partner Center',
      deptId: center.id,
      status: 'active'
    }, { transaction });

    // Link admin to department
    await center.update({ adminId: centerUser.uid }, { transaction });

    // 2. Map Programs (if selected)
    if (programIds && Array.isArray(programIds)) {
      const { CenterProgram, Program } = models;
      const programs = await Program.findAll({ 
        where: { id: programIds },
        attributes: ['id', 'subDeptId']
      });

      for (const pId of programIds) {
        const prog = programs.find(p => p.id === parseInt(pId));
        await CenterProgram.create({
          centerId: center.id,
          programId: parseInt(pId),
          subDeptId: prog?.subDeptId || null,
          isActive: true
        }, { transaction });
      }
    }

    // 3. Update Lead Status
    await lead.update({ status: 'CONVERTED', centerId: center.id }, { transaction });

    // 4. Log Touchpoint (Safe type 'note' to avoid ENUM sync issues)
    const { LeadTouchpoint } = models;
    await LeadTouchpoint.create({
      leadId: lead.id,
      type: 'note', 
      content: `[SYSTEM_TRANSITION] Lead converted to Center: ${center.name}. Programs: ${programIds?.join(', ') || 'N/A'}`,
      createdBy: req.user.uid || req.user.id
    }, { transaction });

    await transaction.commit();
    res.status(201).json({ success: true, centerId: center.id });
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error("SALES CONVERSION FAILURE:", error);
    res.status(500).json({ 
      message: "Lead conversion protocol failure", 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Legacy routes preserved or simplified
router.post('/leads/:id/assign', authenticate, authorize(['Organization Admin', 'Sales & CRM Admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { assignedTo } = req.body;
    const lead = await Lead.findByPk(id);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    await lead.update({ assignedTo, employeeId: assignedTo });
    res.json({ message: 'Ownership transferred', lead });
  } catch (error) {
    console.error("SALES ERROR (Assign):", error);
    res.status(500).json({ message: error.message });
  }
});

router.put('/leads/:id/status', authenticate, authorize(['Sales & CRM Admin', 'Organization Admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const lead = await Lead.findByPk(id);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    await lead.update({ status });
    res.json({ message: `Status updated to ${status}`, lead });
  } catch (error) {
    console.error("SALES ERROR (Status):", error);
    res.status(500).json({ message: error.message });
  }
});

// GET Programs for a Converted Lead's Center
router.get('/leads/:id/center-programs', authenticate, authorize(['Sales & CRM Admin', 'Organization Admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const lead = await Lead.findByPk(id);
    if (!lead || !lead.centerId) return res.status(404).json({ error: 'Converted center not found' });

    const { CenterProgram, Program } = models;
    const programs = await CenterProgram.findAll({
      where: { centerId: lead.centerId, isActive: true },
      include: [{ model: Program, attributes: ['id', 'name', 'shortName', 'type'] }]
    });

    res.json(programs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch center programs' });
  }
});

// SYNC Programs for a Converted Lead's Center
router.put('/leads/:id/sync-programs', authenticate, authorize(['Sales & CRM Admin', 'Organization Admin']), async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { programIds } = req.body; // Array of IDs

    const lead = await Lead.findByPk(id);
    if (!lead || !lead.centerId) return res.status(404).json({ error: 'Converted center not found' });

    const { CenterProgram, Program } = models;

    // 1. Deactivate current (soft delete approach) or just update isActive
    await CenterProgram.update({ isActive: false }, { 
      where: { centerId: lead.centerId },
      transaction 
    });

    // 2. Add/Reactively activate new ones
    if (programIds && Array.isArray(programIds)) {
      const programs = await Program.findAll({ 
        where: { id: programIds },
        attributes: ['id', 'subDeptId']
      });

      for (const pId of programIds) {
        const prog = programs.find(p => p.id === parseInt(pId));
        const [mapping, created] = await CenterProgram.findOrCreate({
          where: { centerId: lead.centerId, programId: parseInt(pId) },
          defaults: { subDeptId: prog?.subDeptId, isActive: true },
          transaction
        });

        if (!created) {
          await mapping.update({ isActive: true, subDeptId: prog?.subDeptId }, { transaction });
        }
      }
    }

    // 3. Log Audit
    const { LeadTouchpoint } = models;
    await LeadTouchpoint.create({
      leadId: lead.id,
      type: 'note',
      content: `[GORM_SYNC] Center programs updated. New count: ${programIds?.length || 0}`,
      createdBy: req.user.uid || req.user.id
    }, { transaction });

    await transaction.commit();
    res.json({ success: true });
  } catch (error) {
    if (transaction) await transaction.rollback();
    res.status(500).json({ error: error.message });
  }
});

export default router;
