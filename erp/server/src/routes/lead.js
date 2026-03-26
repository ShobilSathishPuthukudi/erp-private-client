import express from 'express';
import { models } from '../models/index.js';
import { v4 as uuidv4 } from 'uuid';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();
const { Lead, LeadTouchpoint, Quotation, Department, User, Deal } = models;

// Public: Submit interest via BDE referral link
router.post('/public/referral', async (req, res) => {
  try {
    const { name, email, phone, referralCode, notes } = req.body;
    
    // Find BDE by referral code
    const bde = await User.findOne({ where: { referralCode } });
    
    const lead = await Lead.create({
      name,
      email,
      phone,
      source: referralCode ? 'Referral' : 'Direct Inquiry',
      referralCode,
      bdeId: bde ? bde.uid : null,
      notes,
      status: 'lead'
    });

    res.status(201).json({ success: true, leadId: lead.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET leads assigned to current BDE or all leads for Sales Head
router.get('/', authenticate, authorize('sales', 'org-admin'), async (req, res) => {
  try {
    const query = req.user.role === 'sales' ? { where: { bdeId: req.user.uid } } : {};
    const leads = await Lead.findAll({
      ...query,
      include: [
        { model: User, as: 'referrer', attributes: ['name', 'email'] },
        { model: LeadTouchpoint, as: 'touchpoints' }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(leads);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST touchpoint for a lead
router.post('/:id/touchpoints', authenticate, authorize('sales', 'org-admin'), async (req, res) => {
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
router.put('/:id/stage', authenticate, authorize('sales', 'org-admin'), async (req, res) => {
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
router.post('/:id/convert', authenticate, authorize('sales', 'org-admin'), async (req, res) => {
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
router.post('/:id/deals', authenticate, authorize('sales', 'org-admin'), async (req, res) => {
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
router.post('/:id/quotations', authenticate, authorize('sales', 'org-admin'), async (req, res) => {
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
