import express from 'express';
import { Op } from 'sequelize';
import { models } from '../models/index.js';
import { verifyToken } from '../middleware/verifyToken.js';
import { logAction } from '../lib/audit.js';

const router = express.Router();
const { AccreditationRequest, Department, Program, User, Notification } = models;

const PARTNER_CENTER_DEPT_TYPES = ['partner-center', 'partner center', 'partner centers'];

const isPartnerCenter = (role) => (role || '').toLowerCase().includes('partner center')
  || (role || '').toLowerCase().includes('study center')
  || (role || '').toLowerCase() === 'study-center';

const resolvePartnerCenter = async (user) => {
  if (user.deptId) {
    const byId = await Department.findByPk(user.deptId);
    if (byId && PARTNER_CENTER_DEPT_TYPES.includes(byId.type)) return byId;
  }
  return Department.findOne({
    where: { adminId: user.uid, type: { [Op.in]: PARTNER_CENTER_DEPT_TYPES } }
  });
};

router.post('/request', verifyToken, async (req, res) => {
  try {
    if (!isPartnerCenter(req.user.role)) {
      return res.status(403).json({ error: 'Only partner centers can submit accreditation requests' });
    }

    const { courseName, universityName, type } = req.body;
    if (!courseName || !universityName || !type) {
      return res.status(400).json({ error: 'courseName, universityName and type are required' });
    }

    const center = await resolvePartnerCenter(req.user);
    if (!center) return res.status(400).json({ error: 'Associated center profile not located' });

    const request = await AccreditationRequest.create({
      centerId: center.id,
      courseName,
      universityName,
      type,
      status: 'pending'
    });

    // Notify Academic Operations Admin(s) that a new program request is awaiting verification
    try {
      const opsAdmins = await User.findAll({
        where: { role: { [Op.in]: ['Academic Operations Admin', 'Operations Admin', 'Organization Admin'] } },
        attributes: ['uid']
      });
      await Promise.all(opsAdmins.map((admin) => Notification.create({
        userUid: admin.uid,
        type: 'info',
        message: `New program request from ${center.name}: "${courseName}" (${type}) awaiting operations review.`,
        link: '/dashboard/operations/accreditation'
      })));
    } catch (notifyError) {
      console.error('[ACCREDITATION_OPS_NOTIFY_ERROR]:', notifyError);
    }

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
