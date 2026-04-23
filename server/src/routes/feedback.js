import express from 'express';
import { models } from '../models/index.js';
import { verifyToken } from '../middleware/verifyToken.js';
import { Op } from 'sequelize';
import { normalizeInstitutionRoleName, normalizeDepartmentName, normalizeSubDepartmentName } from '../config/institutionalStructure.js';

const router = express.Router();
const { Survey, SurveyResponse, User, Department } = models;

const isAdmin = (req, res, next) => {
  const role = req.user.role?.toLowerCase();
  if (['organization admin', 'operations admin', 'hr administrator', 'hr admin'].includes(role)) {
    return next();
  }
  res.status(403).json({ error: 'Access denied' });
};

const normalizeSurveyTargetRole = (targetRole = '') => {
  const tr = String(targetRole).toLowerCase().trim();
  if (tr === 'ops' || tr === 'operations') return 'academic';
  if (tr === 'partner center' || tr === 'partner centers') return 'center';
  if (tr === 'open school') return 'openschool';
  return tr;
};

const buildUserSurveySlugs = (user) => {
  const normalizedRole = normalizeInstitutionRoleName(user?.role || '').toLowerCase();
  const normalizedDeptName = normalizeDepartmentName(user?.department?.name || '').toLowerCase();
  const normalizedSubDept = normalizeSubDepartmentName(user?.subDepartment || '').toLowerCase();

  const slugs = new Set(['all']);

  if (normalizedRole.includes('hr') || normalizedDeptName.includes('hr')) slugs.add('hr');
  if (normalizedRole.includes('finance') || normalizedDeptName.includes('finance')) slugs.add('finance');
  if (
    normalizedRole.includes('academic operations') ||
    normalizedRole.includes('operations') ||
    normalizedDeptName.includes('academic operations') ||
    normalizedDeptName.includes('operations')
  ) {
    slugs.add('academic');
    slugs.add('ops');
  }
  if (normalizedRole.includes('sales') || normalizedDeptName.includes('sales')) slugs.add('sales');
  if (normalizedRole.includes('ceo') || normalizedDeptName.includes('executive')) slugs.add('ceo');
  if (normalizedRole.includes('student')) slugs.add('student');
  if (normalizedRole.includes('partner center') || normalizedDeptName.includes('partner center')) slugs.add('center');

  if (normalizedSubDept) {
    if (normalizedSubDept.includes('open school')) slugs.add('openschool');
    if (normalizedSubDept.includes('online')) slugs.add('online');
    if (normalizedSubDept.includes('skill')) slugs.add('skill');
    if (normalizedSubDept.includes('bvoc')) slugs.add('bvoc');
  }

  return [...slugs];
};

const normalizeSurveyExpiryDate = (rawExpiryDate) => {
  if (!rawExpiryDate) return null;
  const parsed = new Date(rawExpiryDate);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getTargetedUsers = async (targetRole) => {
  const normalizedTarget = normalizeSurveyTargetRole(targetRole);
  const users = await User.unscoped().findAll({
    where: { status: 'active' },
    include: [{ model: Department.unscoped(), as: 'department', attributes: ['name'], required: false }]
  });

  if (normalizedTarget === 'all') return users;

  return users.filter((user) => buildUserSurveySlugs(user).includes(normalizedTarget));
};

// Create a new Survey
router.post('/surveys', verifyToken, isAdmin, async (req, res) => {
  try {
    const { title, description, targetRole, questions, expiryDate } = req.body;
    
    if (!targetRole) {
      return res.status(400).json({ error: 'Target audience is required' });
    }

    const survey = await Survey.create({
      title,
      description,
      targetRole: normalizeSurveyTargetRole(targetRole),
      questions,
      expiryDate: normalizeSurveyExpiryDate(expiryDate),
      createdBy: req.user.uid
    });

    // Notify targeted users
    const users = await getTargetedUsers(targetRole);
    const io = req.io;

    // Create persistent notifications and emit socket events
    if (users.length > 0) {
      await Promise.all(users.map(async (user) => {
        try {
          await models.Notification.create({
            userUid: user.uid,
            panelScope: 'employee',
            type: 'info',
            message: `INSTITUTIONAL SURVEY: ${title}`,
            isRead: false,
            link: '/dashboard/shared/surveys'
          });
          if (io) {
            io.to(user.uid).emit('notification', {
              targetUid: user.uid,
              type: 'info',
              message: `New Institutional Survey: ${title}`
            });
          }
        } catch (innerErr) {
          console.error('[SURVEY] Notification failed for user:', user.uid);
        }
      })).catch(err => console.error('[SURVEY] Bulk notification failed:', err.message));
    }

    res.status(201).json(survey);
  } catch (error) {
    console.error('[SURVEY] Create error:', error);
    res.status(500).json({ 
      error: 'Failed to create survey', 
      details: error.message,
      stack: error.stack
    });
  }
});

// Get active surveys for current user
router.get('/active', verifyToken, async (req, res) => {
  try {
    const userWithDept = await User.unscoped().findByPk(req.user.uid, {
      include: [{ model: Department, as: 'department', attributes: ['name'] }]
    });
    const userSlugs = buildUserSurveySlugs(userWithDept || req.user);

    const surveys = await Survey.findAll({
      where: {
        status: 'active',
        [Op.or]: [
          { expiryDate: { [Op.gt]: new Date() } },
          { expiryDate: null }
        ],
        targetRole: { [Op.in]: userSlugs }
      },
      include: [
        {
          model: SurveyResponse,
          where: { userUid: req.user.uid },
          required: false 
        }
      ]
    });

    // Filter out surveys the user already responded to
    const pendingSurveys = surveys.filter(s => s.survey_responses.length === 0);
    
    res.json(pendingSurveys);
  } catch (error) {
    console.error('Fetch active surveys error:', error);
    res.status(500).json({ error: 'Failed to fetch surveys' });
  }
});

// Submit a response
router.post('/respond', verifyToken, async (req, res) => {
  try {
    const { surveyId, answers } = req.body;
    
    const survey = await Survey.findByPk(surveyId);
    if (!survey) return res.status(404).json({ error: 'Survey not found' });

    // Check expiry
    if (survey.expiryDate && new Date(survey.expiryDate) < new Date()) {
      return res.status(400).json({ error: 'This survey has expired and is no longer accepting submissions.' });
    }

    const existing = await SurveyResponse.findOne({ where: { surveyId, userUid: req.user.uid } });
    if (existing) {
      return res.status(400).json({ error: 'You have already completed this survey' });
    }

    const response = await SurveyResponse.create({
      surveyId,
      userUid: req.user.uid,
      answers
    });

    res.status(201).json(response);
  } catch (error) {
    console.error('Submit response error:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

router.get('/results/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const survey = await Survey.findByPk(id, {
      include: [
        { 
          model: SurveyResponse,
          include: [{ model: User, attributes: ['uid', 'name', 'email'] }]
        }
      ]
    });

    if (!survey) return res.status(404).json({ error: 'Survey not found' });

    // Fetch targeted users to show "Whom Assigned"
    const targetedUsers = await getTargetedUsers(survey.targetRole);

    res.json({
      ...survey.toJSON(),
      targetedUsers: targetedUsers.map((user) => ({
        uid: user.uid,
        name: user.name,
        email: user.email,
        role: user.role
      }))
    });
  } catch (error) {
    console.error('Fetch survey results error:', error);
    res.status(500).json({ error: 'Failed to fetch results', details: error.message });
  }
});

// Get all surveys (Admin only)
router.get('/all', verifyToken, isAdmin, async (req, res) => {
  try {
    const surveys = await Survey.findAll({
      order: [['createdAt', 'DESC']],
      include: [
        { 
          model: SurveyResponse,
          include: [{ model: User, attributes: ['uid', 'name'] }]
        }
      ]
    });
    res.json(surveys);
  } catch (error) {
    console.error('Fetch all surveys error:', error);
    res.status(500).json({ error: 'Failed to fetch surveys', details: error.message });
  }
});

export default router;
