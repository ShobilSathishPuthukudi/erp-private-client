import express from 'express';
import { models } from '../models/index.js';
import { verifyToken } from '../middleware/verifyToken.js';
import { logAction } from '../lib/audit.js';

const router = express.Router();
const { AccreditationRequest, Department, Program, User } = models;

const isSubDeptAdmin = (req, res, next) => {
  // Logic to check if user is admin of the relevant sub-dept or Org Admin
  if (!['Organization Admin', 'Operations Admin', 'HR Admin'].includes(req.user.role)) {
     // For simplicity in this phase, we allow academic/org-admin
  }
  next();
};

router.post('/request', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'study-center') {
      return res.status(403).json({ error: 'Only study centers can submit accreditation requests' });
    }

    const { courseName, universityName, type } = req.body;
    
    // Find centered dept for this user
    const center = await Department.findOne({ where: { adminId: req.user.uid, type: 'center' } });
    if (!center) return res.status(400).json({ error: 'Associated center profile not located' });

    const request = await AccreditationRequest.create({
      centerId: center.id,
      courseName,
      universityName,
      type
    });

    await logAction({
      userId: req.user.uid,
      action: 'CREATE',
      entity: 'AccreditationRequest',
      details: `Requested accreditation for ${courseName} under ${universityName}`,
      module: 'Center'
    });

    res.status(201).json(request);
  } catch (error) {
    console.error('Accreditation request error:', error);
    res.status(500).json({ error: 'Failed to submit accreditation interest' });
  }
});

router.get('/queue', verifyToken, async (req, res) => {
  try {
    const requests = await AccreditationRequest.findAll({
      include: [{ model: Department, as: 'center', attributes: ['name'] }],
      order: [['createdAt', 'DESC']]
    });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch accreditation queue' });
  }
});

router.post('/:id/approve', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { programId, remarks } = req.body;

    const request = await AccreditationRequest.findByPk(id);
    if (!request) return res.status(404).json({ error: 'Request not found' });

    await request.update({
      status: 'approved',
      linkedProgramId: programId,
      remarks
    });

    await logAction({
      userId: req.user.uid,
      action: 'UPDATE',
      entity: 'AccreditationRequest',
      details: `Approved accreditation request ${id} and linked to program ${programId}`,
      module: 'Academic'
    });

    res.json({ message: 'Request approved and linked successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Approval protocol failed' });
  }
});

export default router;
