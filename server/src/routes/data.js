import express from 'express';
import { models } from '../models/index.js';
import { verifyToken } from '../middleware/verifyToken.js';

const router = express.Router();

// Mock backup registry (in a real app, this would be a DB table 'Backup')
let backups = [
  { id: 1, name: 'Full System Snapshot - 2026-03-01', size: '1.2GB', status: 'completed', timestamp: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000) },
  { id: 2, name: 'Partial Audit Export - 2026-03-15', size: '45MB', status: 'completed', timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) }
];

const isAdmin = (req, res, next) => {
  if (req.user.role !== 'Organization Admin') {
    return res.status(403).json({ error: 'Access denied' });
  }
  next();
};

// List backups
router.get('/backups', verifyToken, isAdmin, async (req, res) => {
  try {
    res.json(backups);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch backup registry' });
  }
});

// Trigger backup
router.post('/backup', verifyToken, isAdmin, async (req, res) => {
  try {
    const newBackup = {
      id: backups.length + 1,
      name: `Manual Backup - ${new Date().toISOString().split('T')[0]}`,
      size: 'Processing...',
      status: 'pending',
      timestamp: new Date()
    };
    
    // Simulate backup process
    backups = [newBackup, ...backups];
    
    setTimeout(() => {
      const b = backups.find(x => x.id === newBackup.id);
      if (b) {
        b.status = 'completed';
        b.size = `${(Math.random() * 500 + 100).toFixed(2)}MB`;
      }
    }, 5000);

    res.status(202).json(newBackup);
  } catch (error) {
    res.status(500).json({ error: 'Failed to initiate backup' });
  }
});

export default router;
