import express from 'express';
import { models } from '../models/index.js';
import { Op } from 'sequelize';
import { verifyToken, roleGuard } from '../middleware/verifyToken.js';
const router = express.Router();
const { CredentialRequest, Department, User } = models;

const REVEAL_WINDOW_MINS = 30;

// Ops: Request Reveal
router.post('/request', verifyToken, roleGuard(['academic', 'SUB_DEPT_ADMIN', 'org-admin']), async (req, res) => {
  try {
    const { centerId, remarks } = req.body;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || '0.0.0.0';

    // 1. Create forensic request
    const request = await CredentialRequest.create({
      centerId,
      requesterId: req.user.uid,
      remarks,
      ipAddress,
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
       // Risk flag logic (placeholder for CEO dashboard sync)
       console.log(`[RISK] Repeated reveal request: Admin ${req.user.uid} for Center ${centerId}`);
    }

    res.status(201).json(request);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Finance: Approve Reveal
router.post('/approve/:id', verifyToken, roleGuard(['finance', 'org-admin']), async (req, res) => {
  try {
    const request = await CredentialRequest.findByPk(req.params.id);
    if (!request) return res.status(404).json({ error: 'Request not found' });

    const revealUntil = new Date(new Date().getTime() + REVEAL_WINDOW_MINS * 60 * 1000);
    
    request.status = 'approved';
    request.revealUntil = revealUntil;
    request.approvedBy = req.user.uid;
    await request.save();

    res.json(request);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Ops: Reveal Actual Credentials
router.get('/reveal/:id', verifyToken, roleGuard(['academic', 'SUB_DEPT_ADMIN', 'org-admin']), async (req, res) => {
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

    // Reveal credentials (institutional logic)
    // NOTE: We only return the sensitive data here. We do NOT log this specific response.
    const credentials = {
       username: request.center.uid,
       password: request.center.password // Assumption: exists in StudyCenter
    };

    res.json(credentials);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Finance: Get Pending Queue
router.get('/pending', verifyToken, roleGuard(['finance', 'org-admin']), async (req, res) => {
  try {
    const queue = await CredentialRequest.findAll({
      where: { status: 'pending' },
      include: [
        { model: Department, as: 'center', attributes: ['name', 'uid'] },
        { model: User, as: 'requester', attributes: ['name', 'uid'] }
      ]
    });
    res.json(queue);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Ops: Get My Requests
router.get('/my-requests', verifyToken, roleGuard(['academic', 'SUB_DEPT_ADMIN', 'org-admin']), async (req, res) => {
  try {
    const requests = await CredentialRequest.findAll({
      where: { requesterId: req.user.uid },
      include: [{ model: Department, as: 'center', attributes: ['name', 'uid'] }],
      order: [['createdAt', 'DESC']]
    });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
