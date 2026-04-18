import express from 'express';
import { models } from '../models/index.js';
import { Op } from 'sequelize';
import bcrypt from 'bcryptjs';

const router = express.Router();
const { User, Department, Lead, Program, Notification } = models;

// DB Check
router.get('/dev-user-check', async (req, res) => {
  try {
    const users = await User.findAll({ attributes: ['uid', 'name', 'role', 'status'] });
    res.json(users);
  } catch(e) { res.json({ error: e.message }); }
});

router.get('/dev-hr-employees', async (req, res) => {
  try {
    const employees = await User.findAll({
      where: {}, 
      attributes: { exclude: ['password'] },
      include: [
        { model: Department, as: 'department', attributes: ['name'], required: false },
        { model: User, as: 'manager', attributes: ['name', 'uid'], required: false }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(employees);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET BDE Info for Public Form via Referral Code
router.get('/bde-info/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const bde = await User.unscoped().findOne({
      where: { 
        [Op.or]: [
          { referralCode: code },
          { uid: code }
        ],
        role: { [Op.in]: ['Sales & CRM Admin', 'Employee', 'employee'] } // Inclusive institutional role
      },
      attributes: ['uid', 'name', 'referralCode', 'role'],
      include: [{
        model: Department,
        as: 'department',
        attributes: ['name'],
        required: false
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
      where: { 
        type: 'universities', 
        status: { [Op.in]: ['active', 'staged'] } // Inclusively list all operational and staged nodes
      },
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
      where: { 
        universityId, 
        status: { [Op.in]: ['active', 'staged'] } // Inclusively list all operational and staged nodes
      },
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
    const { name, shortName, email, phone, website, code, infrastructure, description, interest } = req.body;

    if (!name || !shortName || !phone || !code || !email || !interest?.universityId || !interest?.programIds || interest?.programIds.length === 0) {
      return res.status(400).json({ error: 'All fields (Name, Short Name, Email, Phone, University, and Program) are strictly mandatory.' });
    }

    const placeholderPassword = 'provision_pending';
    const hashedPassword = await bcrypt.hash(placeholderPassword, 10);

    // 1. Verify BDE via Referral Code or UID
    const bde = await User.unscoped().findOne({ 
      where: { 
        [Op.or]: [
          { referralCode: code },
          { uid: code }
        ],
        role: { [Op.in]: ['Sales & CRM Admin', 'Employee', 'employee'] }
      } 
    });
    if (!bde) {
      return res.status(400).json({ error: 'Invalid or expired referral link' });
    }

    const bdeId = bde.uid;

    // 2. Create high-fidelity Department record
    const center = await Department.create({
      name,
      shortName: shortName.toUpperCase().trim(),
      type: 'partner centers',
      status: 'proposed',
      auditStatus: 'pending', // Key for Ops Audit
      bdeId,
      metadata: {
        referralCode: code,
        contactPhone: phone,
        website: website,
        infrastructure,
        onboardingNotes: description,
        onboardedAt: new Date().toISOString(),
        primaryInterest: interest // Captures universityId and programIds array
      }
    }, { transaction: t });

    // 3. Create Admin User for the Center
    const centerUid = `CTR-${Math.floor(100000 + Math.random() * 900000)}`;
    const centerAdmin = await User.create({
      uid: centerUid,
      email: email,
      password: hashedPassword,
      devPassword: placeholderPassword, // Preserve for quick-login dev panel
      name: name, // Center Legal Name as initial user name
      role: 'Partner Center',
      deptId: center.id,
      status: 'active' // User active, but Department inactive controls access
    }, { transaction: t });

    // Link department to admin
    await center.update({ adminId: centerUid }, { transaction: t });

    // 4. Create Trace Lead for CRM compatibility
    const lead = await Lead.create({
      name,
      email,
      phone,
      source: 'Referral Onboarding',
      bdeId,
      centerId: center.id,
      status: 'CONVERTED', // Auto-convert
      notes: `${description || ''} | Website: ${website || 'N/A'} | Ref: ${code} (${bde.name})`
    }, { transaction: t });
    
    // 5. Trigger Institutional State Transitions: Stage the university and selected program
    await Department.update(
      { status: 'staged' }, 
      { where: { id: interest.universityId, type: 'universities' }, transaction: t }
    );
    
    await Program.update(
      { status: 'staged' }, 
      { where: { id: { [Op.in]: interest.programIds } }, transaction: t }
    );

    // 6. Alert BDE of high-value conversion
    await Notification.create({
      userUid: bdeId,
      type: 'success',
      message: `Strategic Partnership Initialized: ${name} registered via your institutional link.`,
      link: '/dashboard/sales/referrals'
    }, { transaction: t });

    // 7. Broadcast notifications to Academic Operations & Institutional Admins
    try {
      const adminRoles = [
        'Academic Operations',
        'Academic Operations Admin',
        'Academic Operations Administrator',
        'Operations Admin',
        'Operations Administrator',
        'Organization Admin',
        'academic operations admin',
        'operations admin',
        'organization admin'
      ];
      
      const opsAdmins = await User.findAll({
        where: { 
          role: { [Op.in]: adminRoles }
        }
      });

      console.log(`[OPS_BROADCAST]: Identified ${opsAdmins.length} administrative recipients for center: ${name}`);

      for (const admin of opsAdmins) {
        await Notification.create({
          userUid: admin.uid,
          type: 'info',
          message: `Institutional Alert: New Center Pending Verification - "${name}" requires audit.`,
          link: '/dashboard/operations/center-audit?tab=pending'
        }, { transaction: t });
      }
    } catch (notifyError) {
      console.error('[OPS_NOTIFY_ERROR]:', notifyError);
      // Non-blocking for the main registration flow
    }

    await t.commit();
    res.status(201).json({ 
      success: true, 
      message: 'Institutional node initialized. Your administrative credentials have been provisioned.',
      centerId: center.id,
      adminUid: centerUid
    });
  } catch (error) {
    if (t) await t.rollback();
    console.error('Center Registration Onboarding Error:', {
      message: error.message,
      stack: error.stack,
      payload: req.body
    });
    res.status(500).json({ 
      error: 'Failed to initialize institutional node',
      details: error.message 
    });
  }
});

export default router;
