import express from 'express';
import { models } from '../models/index.js';
import { Op } from 'sequelize';
import bcrypt from 'bcryptjs';

const router = express.Router();
const { User, Department, Lead, Program, Notification } = models;

// GET BDE Info for Public Form via Referral Code
router.get('/bde-info/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const bde = await User.findOne({
      where: { 
        [Op.or]: [
          { referralCode: code },
          { uid: code }
        ],
        role: { [Op.in]: ['Sales & CRM Admin', 'employee'] } // Inclusive institutional role
      },
      attributes: ['uid', 'name', 'referralCode', 'role'],
      include: [{
        model: Department,
        attributes: ['name']
      }]
    });

    if (!bde) {
      return res.status(404).json({ error: 'Sales representative not found' });
    }

    res.json(bde);
  } catch (error) {
    console.error('BDE Info Fetch Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET Institutional Branding Info
router.get('/org-info', async (req, res) => {
  try {
    const { OrgConfig } = models;
    const [name, shortName] = await Promise.all([
        OrgConfig.findOne({ where: { key: 'ORG_NAME' } }),
        OrgConfig.findOne({ where: { key: 'ORG_SHORT_NAME' } })
    ]);

    res.json({
        name: name?.value || 'Institutional Portal',
        shortName: shortName?.value || 'IP'
    });
  } catch (error) {
    console.error('Org Info Fetch Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET Public University List
router.get('/universities', async (req, res) => {
  try {
    const universities = await Department.findAll({
      where: { type: 'university', status: { [Op.in]: ['draft', 'staged', 'active'] } },
      attributes: ['id', 'name']
    });
    res.json(universities);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch university roster' });
  }
});

// GET Public Program List (Filtered by University)
router.get('/programs/:universityId', async (req, res) => {
  try {
    const { universityId } = req.params;
    const programs = await Program.findAll({
      where: { universityId, status: { [Op.in]: ['draft', 'staged', 'active'] } },
      attributes: ['id', 'name', 'type', 'subDeptId']
    });
    res.json(programs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch program catalog' });
  }
});

// POST Register Center (Public Direct Onboarding)
router.post('/register-center', async (req, res) => {
  const { sequelize } = await import('../models/index.js');
  const t = await sequelize.transaction();
  try {
    const { name, email, phone, code, infrastructure, description, interest } = req.body;
    const hashedPassword = await bcrypt.hash('password123', 10);

    if (!name || !phone || !code || !email || !interest?.universityId || !interest?.programId) {
      return res.status(400).json({ error: 'All fields (Name, Email, Phone, University, and Program) are strictly mandatory.' });
    }

    // 1. Verify BDE via Referral Code or UID
    const bde = await User.findOne({ 
      where: { 
        [Op.or]: [
          { referralCode: code },
          { uid: code }
        ]
      } 
    });
    if (!bde) {
      return res.status(400).json({ error: 'Invalid or expired referral link' });
    }

    const bdeId = bde.uid;

    // 2. Create high-fidelity Department record
    const center = await Department.create({
      name,
      shortName: name.substring(0, 5).toUpperCase(),
      type: 'study-center',
      status: 'inactive',
      auditStatus: 'pending', // Key for Ops Audit
      bdeId,
      metadata: {
        referralCode: code,
        contactPhone: phone,
        infrastructure,
        onboardingNotes: description,
        onboardedAt: new Date().toISOString(),
        primaryInterest: interest // Captured from Cascading Selects
      }
    }, { transaction: t });


    // 4. Create Trace Lead for CRM compatibility
    const lead = await Lead.create({
      name,
      email,
      phone,
      source: 'Referral Onboarding',
      bdeId,
      centerId: center.id,
      status: 'converted', // Auto-convert
      notes: description || `Direct onboarding via ${code} (${bde.name})`
    }, { transaction: t });
    
    // 5. Trigger Institutional State Transitions: Stage the university and selected program
    await Department.update(
      { status: 'staged' }, 
      { where: { id: interest.universityId, type: 'university' }, transaction: t }
    );
    
    await Program.update(
      { status: 'staged' }, 
      { where: { id: interest.programId }, transaction: t }
    );

    // 6. Alert BDE of high-value conversion
    await Notification.create({
      userUid: bdeId,
      type: 'success',
      message: `Strategic Partnership Initialized: ${name} registered via your institutional link.`,
      link: '/dashboard/sales/referrals'
    }, { transaction: t });

    await t.commit();
    res.status(201).json({ 
      success: true, 
      message: 'Institutional node initialized. Awaiting audit.',
      centerId: center.id,
      leadId: lead.id 
    });
  } catch (error) {
    if (t) await t.rollback();
    console.error('Center Registration Onboarding Error:', error);
    res.status(500).json({ error: 'Failed to initialize institutional node' });
  }
});

export default router;
