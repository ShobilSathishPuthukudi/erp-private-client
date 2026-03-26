import express from 'express';
import { models } from '../models/index.js';
import { verifyToken } from '../middleware/verifyToken.js';
import { Op } from 'sequelize';

const router = express.Router();
const { Survey, SurveyResponse, User } = models;

const isAdmin = (req, res, next) => {
  if (['org-admin', 'system-admin', 'academic'].includes(req.user.role)) {
    return next();
  }
  res.status(403).json({ error: 'Access denied' });
};

// Create a new Survey
router.post('/surveys', verifyToken, isAdmin, async (req, res) => {
  try {
    const { title, description, targetRole, questions } = req.body;
    
    const survey = await Survey.create({
      title,
      description,
      targetRole,
      questions,
      createdBy: req.user.uid
    });

    // Notify targeted users via Socket.io
    const io = req.io;
    const users = await User.findAll({ where: { role: targetRole === 'all' ? { [Op.ne]: null } : targetRole } });
    
    users.forEach(user => {
      io.emit('notification', {
        targetUid: user.uid,
        type: 'info',
        message: `New Institutional Survey: ${title}`
      });
    });

    res.status(201).json(survey);
  } catch (error) {
    console.error('Create survey error:', error);
    res.status(500).json({ error: 'Failed to create survey' });
  }
});

// Get active surveys for current user
router.get('/active', verifyToken, async (req, res) => {
  try {
    const surveys = await Survey.findAll({
      where: {
        status: 'active',
        [Op.or]: [
          { targetRole: req.user.role },
          { targetRole: 'all' }
        ]
      },
      include: [
        {
          model: SurveyResponse,
          where: { userUid: req.user.uid },
          required: false // Only show if user HASN'T responded yet (optional logic)
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

// Get results (Admin only)
router.get('/results/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const survey = await Survey.findByPk(id, {
      include: [{ model: SurveyResponse }]
    });

    if (!survey) return res.status(404).json({ error: 'Survey not found' });

    res.json(survey);
  } catch (error) {
    console.error('Fetch results error:', error);
    res.status(500).json({ error: 'Failed to fetch results' });
  }
});

// Get all surveys (Admin only)
router.get('/all', verifyToken, isAdmin, async (req, res) => {
  try {
    const surveys = await Survey.findAll({
      order: [['createdAt', 'DESC']],
      include: [{ model: SurveyResponse }]
    });
    res.json(surveys);
  } catch (error) {
    console.error('Fetch all surveys error:', error);
    res.status(500).json({ error: 'Failed to fetch surveys' });
  }
});

export default router;
