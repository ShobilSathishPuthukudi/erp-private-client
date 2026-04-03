import express from 'express';
import { Op } from 'sequelize';
import { models } from '../models/index.js';
import { verifyToken } from '../middleware/verifyToken.js';

const router = express.Router();
const { AuditLog, User, sequelize } = models;

const isOrgAdmin = (req, res, next) => {
  if (req.user.role !== 'Organization Admin' && req.user.role !== 'org-admin' && req.user.role !== 'system-admin') {
    return res.status(403).json({ error: 'Access denied: Org Admin privileges required' });
  }
  next();
};

router.get('/', verifyToken, isOrgAdmin, async (req, res) => {
  try {
    const { 
      user, 
      module, 
      action, 
      entity, 
      startDate, 
      endDate,
      page = 1,
      limit = 50 
    } = req.query;

    const where = {};
    if (user) where.userId = user;
    if (module && module !== 'All') where.module = module;
    if (action) where.action = action;
    if (entity) where.entity = entity;
    if (startDate && endDate) {
      where.timestamp = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await AuditLog.findAndCountAll({
      where,
      order: [['timestamp', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [{ model: User, as: 'user', attributes: ['name', 'email', 'role'] }]
    });

    res.json({
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit),
      logs: rows
    });
  } catch (error) {
    console.error('Fetch audit logs error:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

router.get('/compliance', verifyToken, isOrgAdmin, async (req, res) => {
  try {
    const { month, year } = req.query;
    const targetMonth = month ? parseInt(month) : new Date().getMonth();
    const targetYear = year ? parseInt(year) : new Date().getFullYear();

    const startOfMonth = new Date(targetYear, targetMonth, 1);
    const endOfMonth = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);

    const logs = await AuditLog.findAll({
      where: {
        timestamp: {
          [Op.between]: [startOfMonth, endOfMonth]
        }
      },
      include: [{ model: User, as: 'user', attributes: ['name', 'role'] }]
    });

    // Breakdown
    const stats = {
      total: logs.length,
      create: logs.filter(l => l.action === 'Create').length,
      update: logs.filter(l => l.action === 'Update').length,
      delete: logs.filter(l => l.action === 'Delete').length
    };

    // Top Users
    const userCounts = {};
    logs.forEach(l => {
      const name = l.user?.name || 'System';
      userCounts[name] = (userCounts[name] || 0) + 1;
    });
    const topUsers = Object.entries(userCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Flagged Actions (High risk logic)
    const flaggedActions = logs.filter(l => {
      // 1. Bulk Deletes (using remarks if available, or just common pattern)
      if (l.action === 'Delete' && (l.entity === 'Invoice' || l.entity === 'Payment')) return true;
      // 2. Permission changes
      if (l.entity === 'Role Matrix' || l.entity === 'Permission') return true;
      // 3. Sensitive data access (if logged)
      if (l.module === 'Security' || l.module === 'Settings') return true;
      return false;
    }).slice(0, 20); // Limit to top 20 for report overview

    res.json({
      month: targetMonth,
      year: targetYear,
      stats,
      topUsers,
      flaggedActions
    });
  } catch (error) {
    console.error('Compliance report error:', error);
    res.status(500).json({ error: 'Failed to generate compliance report' });
  }
});

router.get('/stats', verifyToken, isOrgAdmin, async (req, res) => {
  try {
    const uptime = process.uptime();
    const memory = process.memoryUsage();
    
    // Database heartbeat
    const startTime = Date.now();
    await sequelize.query('SELECT 1');
    const latency = Date.now() - startTime;

    const totalLogs = await AuditLog.count();
    const recentLogs = await AuditLog.count({
      where: {
        timestamp: { [Op.gt]: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }
    });

    res.json({
      uptime,
      memory: {
        heapUsed: Math.round(memory.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memory.heapTotal / 1024 / 1024),
        rss: Math.round(memory.rss / 1024 / 1024)
      },
      database: {
        status: 'connected',
        latency: `${latency}ms`
      },
      counts: {
        totalAuditLogs: totalLogs,
        recent24h: recentLogs
      },
      nodeVersion: process.version,
      platform: process.platform
    });
  } catch (error) {
    console.error('Fetch system stats error:', error);
    res.status(500).json({ error: 'Failed to fetch system metrics' });
  }
});

export default router;
