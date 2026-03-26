import express from 'express';
import { sequelize, models } from '../models/index.js';
import { Op } from 'sequelize';
import { verifyToken, roleGuard, isAcademicOrAdmin, isSystemAdmin } from '../middleware/verifyToken.js';
const router = express.Router();
const { CredentialRequest, Department, User } = models;

const REVEAL_WINDOW_MINS = 30;

// Ops: Request Reveal/Reset
router.post('/request', verifyToken, isAcademicOrAdmin, async (req, res) => {
  try {
    const { centerId, remarks, type } = req.body;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || '0.0.0.0';

    // 1. Create forensic request
    const request = await CredentialRequest.create({
      centerId,
      requesterId: req.user.uid,
      remarks,
      ipAddress,
      type: type || 'VIEW',
      status: 'pending'
    });

    // 2. Risk Metric: Check for repeated requests (same center/admin within 24h)
    const dayAgo = new Date(new Date().getTime() - 24 * 60 * 60 * 1000);
    const repeats = await CredentialRequest.count({
      where: {
        centerId,
        requesterId: req.user.uid,
        createdAt: { [Op.gt]: dayAgo }
      }
    });

    if (repeats >= 2) {
       console.log(`[RISK] Repeated ${type} request: Admin ${req.user.uid} for Center ${centerId}`);
    }

    res.status(201).json(request);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Finance: Approve Reveal/Reset
router.post('/approve/:id', verifyToken, roleGuard(['finance', 'org-admin', 'system-admin']), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const request = await CredentialRequest.findByPk(req.params.id, {
      include: [{ model: Department, as: 'center' }],
      transaction: t
    });
    if (!request) return res.status(404).json({ error: 'Request not found' });

    const revealUntil = new Date(new Date().getTime() + REVEAL_WINDOW_MINS * 60 * 1000);
    
    request.status = 'approved';
    request.revealUntil = revealUntil;
    request.approvedBy = req.user.uid;
    await request.save({ transaction: t });

    // Handle RESET logic: Generate new institutional password
    if (request.type === 'RESET') {
      const newPassword = Math.random().toString(36).slice(-10).toUpperCase();
      await request.center.update({ password: newPassword }, { transaction: t });
      
      // Log to AuditLog (GAP-5)
      await models.AuditLog.create({
        entity: 'StudyCenter',
        action: 'PASSWORD_RESET',
        userId: req.user.uid,
        after: { centerId: request.centerId, centerName: request.center.name },
        remarks: `Authorized password reset via forensic request #${request.id}`,
        ipAddress: req.ip || '0.0.0.0',
        module: 'Academic'
      }, { transaction: t });
    }

    await t.commit();
    res.json(request);
  } catch (error) {
    await t.rollback();
    res.status(400).json({ error: error.message });
  }
});

// Ops: Reveal Actual Credentials (or Reset confirmation)
router.get('/reveal/:id', verifyToken, isAcademicOrAdmin, async (req, res) => {
  try {
    const request = await CredentialRequest.findByPk(req.params.id, {
      include: [{ model: Department, as: 'center' }]
    });

    if (!request || request.status !== 'approved') {
       return res.status(403).json({ error: 'Access unauthorized' });
    }

    if (new Date() > new Date(request.revealUntil)) {
       return res.status(403).json({ error: 'Reveal window expired' });
    }

    if (request.requesterId !== req.user.uid) {
       return res.status(403).json({ error: 'Access restricted to requester' });
    }

    // Log the reveal event
    await models.AuditLog.create({
      entity: 'CredentialReveal',
      action: request.type === 'VIEW' ? 'REVEAL' : 'RESET_REVEAL',
      userId: req.user.uid,
      remarks: `Accessed credentials for ${request.center.name} (Request #${request.id}, Type: ${request.type})`,
      ipAddress: req.ip || '0.0.0.0',
      module: 'Academic'
    });

    res.json({
       username: request.center.id.toString(), // Alias id as username/uid if needed
       password: request.center.password,
       type: request.type
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Finance: Get Pending Queue
router.get('/pending', verifyToken, roleGuard(['finance', 'org-admin', 'system-admin']), async (req, res) => {
  try {
    const queue = await CredentialRequest.findAll({
      where: { status: 'pending' },
      include: [
        { model: Department, as: 'center', attributes: ['name', ['id', 'uid']] },
        { model: User, as: 'requester', attributes: ['name'] }
      ]
    });
    res.json(queue);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Ops: Get My Requests
router.get('/my-requests', verifyToken, isAcademicOrAdmin, async (req, res) => {
  try {
    const requests = await CredentialRequest.findAll({
      where: { requesterId: req.user.uid },
      include: [{ model: Department, as: 'center', attributes: ['name', ['id', 'uid']] }],
      order: [['createdAt', 'DESC']]
    });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
