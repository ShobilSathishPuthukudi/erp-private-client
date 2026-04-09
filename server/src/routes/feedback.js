import express from 'express';
import { models } from '../models/index.js';
import { verifyToken } from '../middleware/verifyToken.js';
import { Op } from 'sequelize';

const router = express.Router();
const { Survey, SurveyResponse, User, Department } = models;

const isAdmin = (req, res, next) => {
  const role = req.user.role?.toLowerCase();
  if (['organization admin', 'operations admin', 'hr administrator', 'hr admin'].includes(role)) {
    return next();
  }
  res.status(403).json({ error: 'Access denied' });
};

const getTargetedUsersQuery = (targetRole) => {
  const tr = targetRole.toLowerCase();
  if (tr === 'ceo') return { role: 'CEO' };
  if (tr === 'hr') return { role: 'HR Admin' };
  if (tr === 'finance') return { role: 'Finance Admin' };
  if (tr === 'sales') return { role: 'Sales & CRM Admin' };
  if (tr === 'academic') return { role: 'Academic Operations Admin' };
  if (tr === 'center') return { role: 'Partner Center' };
  if (tr === 'openschool') return { role: 'Open School Admin' };
  if (tr === 'online') return { role: 'Online Department Admin' };
  if (tr === 'skill') return { role: 'Skill Department Admin' };
  if (tr === 'bvoc') return { role: 'BVoc Department Admin' };
  if (tr === 'all') return {};
  return { role: 'unknown' }; // Safeguard
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
      targetRole,
      questions,
      expiryDate: expiryDate || null,
      createdBy: req.user.uid
    });

    // Notify targeted users
    let userQuery = {};
    const tr = targetRole.toLowerCase();
    
    // Exact mapping to baseline roles in seed/index.js
    if (tr === 'ceo') {
      userQuery = { role: 'CEO' };
    } else if (tr === 'hr') {
      userQuery = { role: 'HR Admin' };
    } else if (tr === 'finance') {
      userQuery = { role: 'Finance Admin' };
    } else if (tr === 'sales') {
      userQuery = { role: 'Sales & CRM Admin' };
    } else if (tr === 'academic') {
      userQuery = { role: 'Academic Operations Admin' };
    } else if (tr === 'center') {
      userQuery = { role: 'Partner Center' };
    } else if (tr === 'openschool') {
      userQuery = { role: 'Open School Admin' };
    } else if (tr === 'online') {
      userQuery = { role: 'Online Department Admin' };
    } else if (tr === 'skill') {
      userQuery = { role: 'Skill Department Admin' };
    } else if (tr === 'bvoc') {
      userQuery = { role: 'BVoc Department Admin' };
    }

    const users = await User.findAll({ where: userQuery });
    const io = req.io;

    // Create persistent notifications and emit socket events
    if (users.length > 0) {
      await Promise.all(users.map(async (user) => {
        try {
          await models.Notification.create({
            userUid: user.uid,
            type: 'SURVEY',
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
    const role = req.user.role?.toLowerCase() || '';
    const subDept = req.user.subDepartment?.toLowerCase() || '';

    // Fetch user's department for deeper targeting (e.g., matching 'Sales Department' to 'sales' slug)
    const userWithDept = await User.unscoped().findByPk(req.user.uid, {
      include: [{ model: Department, as: 'department', attributes: ['name'] }]
    });
    const deptName = userWithDept?.department?.name?.toLowerCase() || '';

    // Map institutional roles to survey slugs
    const userSlugs = ['all'];
    if (role.includes('hr') || deptName.includes('hr')) userSlugs.push('hr');
    if (role.includes('finance') || deptName.includes('finance')) userSlugs.push('finance');
    if (role.includes('ops') || role.includes('operations') || deptName.includes('ops') || deptName.includes('operations')) userSlugs.push('ops');
    if (role.includes('sales') || deptName.includes('sales')) userSlugs.push('sales');
    if (role.includes('ceo') || deptName.includes('executive')) userSlugs.push('ceo');
    if (role.includes('student')) userSlugs.push('student');
    
    // Fallback for direct matches
    if (subDept) userSlugs.push(subDept);

    const surveys = await Survey.findAll({
      where: {
        status: 'active',
        expiryDate: {
          [Op.or]: [
            { [Op.gt]: new Date() },
            { [Op.eq]: null }
          ]
        },
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
    const targetedUsers = await User.findAll({
      where: getTargetedUsersQuery(survey.targetRole),
      attributes: ['uid', 'name', 'email', 'role']
    });

    res.json({
      ...survey.toJSON(),
      targetedUsers
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
