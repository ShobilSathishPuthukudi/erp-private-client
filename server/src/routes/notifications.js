import express from 'express';
import { models } from '../models/index.js';
import { verifyToken } from '../middleware/verifyToken.js';
import { Op } from 'sequelize';
import { normalizeInstitutionRoleName } from '../config/institutionalStructure.js';

const router = express.Router();
const { Notification } = models;

const normalizePanelScope = (value = '') => {
  const normalized = normalizeInstitutionRoleName(value || '');
  if (!normalized) return null;
  return normalized.toLowerCase().trim();
};

const inferPanelScopeFromLink = (link = '') => {
  if (!link) return null;

  if (link.startsWith('/hr/')) return normalizePanelScope('HR Admin');

  if (!link.startsWith('/dashboard/')) return null;

  const parts = link.split('/').filter(Boolean);
  const panel = parts[1];
  const subPanel = parts[2];

  if (panel === 'employee') return normalizePanelScope('Employee');
  if (panel === 'hr') return normalizePanelScope('HR Admin');
  if (panel === 'finance') return normalizePanelScope('Finance Admin');
  if (panel === 'sales') return normalizePanelScope('Sales Admin');
  if (panel === 'ceo') return normalizePanelScope('CEO');
  if (panel === 'org-admin') return normalizePanelScope('Organization Admin');
  if (panel === 'partner-center' || panel === 'study-center' || panel === 'center') return 'partner center';
  if (panel === 'student') return 'student';
  if (panel === 'academic' || panel === 'operations') return normalizePanelScope('Academic Operations Admin');
  if (panel === 'subdept') {
    if (subPanel === 'bvoc') return normalizePanelScope('BVoc Admin');
    if (subPanel === 'online') return normalizePanelScope('Online Admin');
    if (subPanel === 'skill') return normalizePanelScope('Skill Admin');
    if (subPanel === 'openschool') return normalizePanelScope('Open School Admin');
  }

  return null;
};

const resolveNotificationPanelScope = (notification) =>
  normalizePanelScope(notification?.panelScope) ||
  inferPanelScopeFromLink(notification?.link || '');

const matchesSessionPanel = (notification, sessionPanelScope) => {
  const notificationScope = resolveNotificationPanelScope(notification);
  if (!notificationScope) return true;
  return notificationScope === sessionPanelScope;
};

// Get My Notifications (Paginated)
router.get('/', verifyToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    const sessionPanelScope = normalizePanelScope(req.user.role);

    const rows = await Notification.findAll({
      where: { userUid: req.user.uid },
      order: [['timestamp', 'DESC']],
      limit: Math.max(limit + offset + 50, 100)
    });

    const filteredNotifications = rows.filter((notification) => matchesSessionPanel(notification, sessionPanelScope));
    const notifications = filteredNotifications.slice(offset, offset + limit);
    const unreadCount = filteredNotifications.filter((notification) => !notification.isRead).length;

    res.json({ 
      notifications, 
      unreadCount,
      pagination: {
        total: filteredNotifications.length,
        limit,
        offset,
        hasMore: offset + notifications.length < filteredNotifications.length
      }
    });
  } catch (error) {
    console.error('Fetch notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark as Read
router.patch('/:id/read', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const sessionPanelScope = normalizePanelScope(req.user.role);
    const notification = await Notification.findOne({
      where: { id, userUid: req.user.uid }
    });

    if (!notification || !matchesSessionPanel(notification, sessionPanelScope)) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    notification.isRead = true;
    await notification.save();

    res.json(notification);
  } catch (error) {
    console.error('Update notification error:', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

// Mark all as Read
router.patch('/read-all', verifyToken, async (req, res) => {
  try {
    const sessionPanelScope = normalizePanelScope(req.user.role);
    const notifications = await Notification.findAll({
      where: { userUid: req.user.uid, isRead: false }
    });

    const targetIds = notifications
      .filter((notification) => matchesSessionPanel(notification, sessionPanelScope))
      .map((notification) => notification.id);

    if (targetIds.length > 0) {
      await Notification.update(
        { isRead: true },
        { where: { id: { [Op.in]: targetIds } } }
      );
    }
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ error: 'Failed to update notifications' });
  }
});

// Create Notification utility (to be used within other routes)
// This is not an endpoint, but a helper logic we could export or use
export const createNotification = async (io, data) => {
  try {
    const targetUid = data.targetUid || data.userId || data.userUid;
    if (!targetUid) {
      throw new Error('Notification recipient is required');
    }

    const panelScope = normalizePanelScope(
      data.panelScope || data.scopeRole || inferPanelScopeFromLink(data.link || '')
    );

    const notification = await Notification.create({
      userUid: targetUid,
      panelScope,
      type: data.type || 'info',
      message: data.title ? `${data.title}: ${data.message}` : data.message,
      link: data.link || null
    });

    if (io) {
      io.emit('notification', {
        ...data,
        targetUid,
        id: notification.id // Include DB ID for frontend handling
      });
    }
    return notification;
  } catch (error) {
    console.error('Create persistent notification error:', error);
  }
};

export const clearNotifications = async ({ userUids = [], links = [], messagePatterns = [] }) => {
  const where = {};
  
  if (userUids.length) {
    where.userUid = { [Op.in]: userUids };
  }

  const filters = [];
  if (links.length) {
    filters.push({ link: { [Op.in]: links } });
  }
  if (messagePatterns.length) {
    filters.push({
      [Op.or]: messagePatterns.map((pattern) => ({
        message: { [Op.like]: pattern }
      }))
    });
  }

  if (!userUids.length && !filters.length) return 0;

  if (filters.length === 1) {
    Object.assign(where, filters[0]);
  } else if (filters.length > 1) {
    where[Op.and] = filters;
  }

  return Notification.destroy({ where });
};

export default router;
