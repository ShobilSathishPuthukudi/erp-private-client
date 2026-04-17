import express from 'express';
import { models } from '../models/index.js';
import { verifyToken } from '../middleware/verifyToken.js';
import { logAction } from '../lib/audit.js';

const router = express.Router();
const { CronJob } = models;

const isAdmin = (req, res, next) => {
  if (req.user.role !== 'Organization Admin') {
    return res.status(403).json({ error: 'Access denied' });
  }
  next();
};

// Get all cron jobs
router.get('/', verifyToken, isAdmin, async (req, res) => {
  try {
    const jobs = await CronJob.findAll({ order: [['id', 'ASC']] });
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch cron registry' });
  }
});

// Manual Run Trigger
router.post('/:id/run', verifyToken, isAdmin, async (req, res) => {
  try {
    const job = await CronJob.findByPk(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    // Mark as pending
    await job.update({ status: 'running' });

    // Note: In a production environment, we should decouple this into a worker
    // For now we will return successfully and let the system "simulate" the run
    
    await logAction({
       userId: req.user.uid,
       action: 'UPDATE',
       entity: 'CronJob',
       details: `Manually triggered ${job.name}`,
       module: 'System'
    });

    res.json({ message: `${job.name} triggered successfully.` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to trigger job' });
  }
});

export default router;
