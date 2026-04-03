import express from 'express';
import { models, sequelize } from '../models/index.js';
import { v4 as uuidv4 } from 'uuid';
import { authenticate, authorize } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';

const router = express.Router();
const { Lead, LeadTouchpoint, Quotation, Department, User, Deal } = models;

// Public: Submit interest via BDE referral link (Direct Center Onboarding)
router.post('/public/referral', async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { name, email, phone, referralCode, notes } = req.body;
    
    // 1. Find BDE by referral code for attribution
    const bde = await User.findOne({ where: { referralCode } });
    if (!bde) {
       return res.status(400).json({ error: 'Invalid or expired referral link' });
    }

    // 2. Create the Center (Department) record directly
    const center = await Department.create({
      name,
      shortName: name.substring(0, 5).toUpperCase(),
      type: 'study-center',
      status: 'inactive',
      auditStatus: 'pending', // Awaiting Ops Team Review
      bdeId: bde.uid,
      metadata: {
        referralCode,
        contactPhone: phone,
        referralNotes: notes,
        registeredAt: new Date().toISOString()
      }
    }, { transaction: t });

    // 3. Create the Center Admin user
    const hashedPassword = await bcrypt.hash('password123', 10);
    const generatedUid = `CTR-REF-${Date.now().toString().slice(-4)}-${center.id}`;

    await User.create({
      uid: generatedUid,
      name,
      email,
      password: hashedPassword,
      role: 'study-center',
      deptId: center.id,
      status: 'active'
    }, { transaction: t });

    // 4. Update Department with adminId
    await center.update({ adminId: generatedUid }, { transaction: t });

    // 5. Create a Lead record for CRM tracking/stats compatibility
    const lead = await Lead.create({
      name,
      email,
      phone,
      source: 'Referral',
      status: 'converted', // Mark as already converted since node created
      referralCode,
      bdeId: bde.uid,
      centerId: center.id,
      notes
    }, { transaction: t });

    await t.commit();
    res.status(201).json({ success: true, centerId: center.id, leadId: lead.id });
  } catch (error) {
    if (t) await t.rollback();
    console.error("REFERRAL ONBOARDING FAILURE:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET leads assigned to current BDE or all leads for Sales Head
router.get('/', authenticate, authorize(['Sales & CRM Admin', 'Organization Admin']), async (req, res) => {
  try {
    const query = req.user.role === 'Sales & CRM Admin' ? { where: { bdeId: req.user.uid } } : {};
    const leads = await Lead.findAll({
      ...query,
      include: [
        { model: User, as: 'employee', required: false },
        { model: Department, as: 'Center', required: false }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(leads);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST touchpoint for a lead
router.post('/:id/touchpoints', authenticate, authorize(['Sales & CRM Admin', 'Organization Admin']), async (req, res) => {
  try {
    const { type, content, outcome, nextAction } = req.body;
    const touchpoint = await LeadTouchpoint.create({
      leadId: req.params.id,
      type,
      content,
      outcome,
      nextAction,
      createdBy: req.user.uid
    });
    res.status(201).json(touchpoint);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update lead stage
router.put('/:id/stage', authenticate, authorize(['Sales & CRM Admin', 'Organization Admin']), async (req, res) => {
  try {
    const { status, remarks } = req.body;
    const lead = await Lead.findByPk(req.params.id);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    lead.status = status;
    await lead.save();

    // Log the stage change as a touchpoint
    await LeadTouchpoint.create({
      leadId: lead.id,
      type: 'note',
      content: `Stage updated to ${status}. Remarks: ${remarks}`,
      createdBy: req.user.uid
    });

    res.json(lead);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST Convert Lead to Study Center
router.post('/:id/convert', authenticate, authorize(['Sales & CRM Admin', 'Organization Admin']), async (req, res) => {
  try {
    const lead = await Lead.findByPk(req.params.id);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    // Create a pending Center record in Department
    const center = await Department.create({
      name: lead.name,
      type: 'study-center',
      status: 'inactive', // Pending Ops Audit
      sourceLeadId: lead.id,
      bdeId: lead.bdeId,
      metadata: {
        contactPerson: lead.name,
        email: lead.email,
        phone: lead.phone,
        conversionDate: new Date().toISOString()
      }
    });

    lead.status = 'converted';
    await lead.save();

    res.status(201).json({ success: true, centerId: center.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Register Deal
router.post('/:id/deals', authenticate, authorize(['Sales & CRM Admin', 'Organization Admin']), async (req, res) => {
  try {
    const deal = await Deal.create({
      leadId: req.params.id,
      ...req.body,
      createdBy: req.user.uid
    });
    res.status(201).json(deal);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Generate Quotation
router.post('/:id/quotations', authenticate, authorize(['Sales & CRM Admin', 'Organization Admin']), async (req, res) => {
  try {
    const { programs, totalFee, remarks } = req.body;
    const quotation = await Quotation.create({
      leadId: req.params.id,
      programDetails: programs,
      totalAmount: totalFee,
      remarks,
      generatedBy: req.user.uid,
      status: 'sent'
    });
    res.status(201).json(quotation);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
