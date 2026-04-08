import express from 'express';
import { models } from '../models/index.js';
import { verifyToken } from '../middleware/verifyToken.js';

const router = express.Router();
const { Notification } = models;

// Get My Notifications (Paginated)
router.get('/', verifyToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    const { count, rows: notifications } = await Notification.findAndCountAll({
      where: { userUid: req.user.uid },
      order: [['timestamp', 'DESC']],
      limit,
      offset
    });

    const unreadCount = await Notification.count({
      where: { userUid: req.user.uid, isRead: false }
    });

    res.json({ 
      notifications, 
      unreadCount,
      pagination: {
        total: count,
        limit,
        offset,
        hasMore: offset + notifications.length < count
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
    const notification = await Notification.findOne({
      where: { id, userUid: req.user.uid }
    });

    if (!notification) return res.status(404).json({ error: 'Notification not found' });

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
    await Notification.update(
      { isRead: true },
      { where: { userUid: req.user.uid, isRead: false } }
    );
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
    const notification = await Notification.create({
      userUid: data.targetUid,
      type: data.type || 'info',
      message: data.message,
      link: data.link || null
    });

    if (io) {
      io.emit('notification', {
        ...data,
        id: notification.id // Include DB ID for frontend handling
      });
    }
    return notification;
  } catch (error) {
    console.error('Create persistent notification error:', error);
  }
};

export default router;
