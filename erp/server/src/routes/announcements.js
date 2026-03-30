import express from 'express';
import { models } from '../models/index.js';
import { Op } from 'sequelize';
import { logAction } from '../lib/audit.js';
import { verifyToken } from '../middleware/verifyToken.js';

const router = express.Router();
const { Announcement, AnnouncementRead, User, Program, Department } = models;
import { createNotification } from './notifications.js';

// HR: Get all announcements
router.get('/hr', verifyToken, async (req, res) => {
    try {
        const announcements = await Announcement.findAll({
            include: [{ model: User, as: 'author', attributes: ['name'] }],
            order: [['createdAt', 'DESC']]
        });
        res.json(announcements);
    } catch (error) {
        console.error('[ANNOUNCEMENTS HR GET ERROR]:', error);
        res.status(500).json({ error: error.message });
    }
});

// HR: Post new announcement
router.post('/hr', verifyToken, async (req, res) => {
    try {
        const { title, message, priority, expiryDate } = req.body;
        const announcement = await Announcement.create({
            title,
            message,
            priority: priority || 'normal',
            expiryDate: expiryDate || null,
            authorId: req.user.uid,
            targetChannel: 'all_employees'
        });
        await logAction({
            userId: req.user.uid,
            action: 'CREATE_ANNOUNCEMENT',
            entity: 'Announcement',
            module: 'HR',
            details: `HR broadcast directive issued: ${announcement.title}`,
            after: announcement
        });
        res.status(201).json(announcement);
    } catch (error) {
        console.error('[ANNOUNCEMENTS HR POST ERROR]:', error);
        res.status(500).json({ error: error.message });
    }
});

// Ops: Get center announcements
router.get('/ops', verifyToken, async (req, res) => {
    try {
        const announcements = await Announcement.findAll({
            where: { targetChannel: 'centers_only' },
            include: [
                { model: Program, as: 'program', attributes: ['name'] },
                { model: Department, as: 'university', attributes: ['name'] }
            ],
            order: [['createdAt', 'DESC']]
        });
        res.json(announcements);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Ops: Post center announcement
router.post('/ops', verifyToken, async (req, res) => {
    try {
        const announcement = await Announcement.create({
            ...req.body,
            authorId: req.user.uid,
            targetChannel: 'centers_only'
        });

        const centerUsers = await User.findAll({
            where: { role: ['study-center', 'center'] }
        });

        for (const u of centerUsers) {
            await createNotification(null, {
                targetUid: u.uid,
                type: announcement.priority === 'urgent' ? 'warning' : 'info',
                message: `New Directive: ${announcement.title}`,
                link: '/dashboard/study-center/announcements'
            });
        }

        await logAction({
            userId: req.user.uid,
            action: 'CREATE_OPS_ANNOUNCEMENT',
            entity: 'Announcement',
            module: 'Operations',
            details: `Operations center-broadcast issued: ${announcement.title}`,
            after: announcement
        });
        res.status(201).json(announcement);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Public: Get unified feed for current user
router.get('/feed', verifyToken, async (req, res) => {
    const { role, deptId, uid } = req.user;
    try {
        let where = {
            [Op.or]: [
                { expiryDate: null },
                { expiryDate: { [Op.gt]: new Date() } }
            ]
        };

        if (role === 'center_admin' || role === 'center' || role === 'study-center') {
            // Centers see Ops announcements matching their programs or all-center Ops announcements
            // Plus any HR all-employee ones? Prompt says HR to all employees.
            where.targetChannel = { [Op.in]: ['all_employees', 'centers_only'] };
            // Optional: Filter center announcements by program/university here
        } else {
            where.targetChannel = 'all_employees';
        }

        const announcements = await Announcement.findAll({
            where,
            include: [
                { 
                    model: AnnouncementRead, 
                    as: 'reads', 
                    where: { userId: uid }, 
                    required: false 
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        // Map read status
        const formatted = announcements.map(a => ({
            ...a.toJSON(),
            isRead: a.reads && a.reads.length > 0
        }));

        res.json(formatted);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Mark as Read
router.post('/:id/read', verifyToken, async (req, res) => {
    try {
        await AnnouncementRead.findOrCreate({
            where: {
                userId: req.user.uid,
                announcementId: req.params.id
            }
        });
        res.sendStatus(200);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete Announcement
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const announcement = await Announcement.findByPk(req.params.id);
        await announcement.destroy();
        await logAction({
            userId: req.user.uid,
            action: 'DELETE_ANNOUNCEMENT',
            entity: 'Announcement',
            module: 'Communications',
            details: `Institutional directive revoked: ${announcement?.title}`,
            before: announcement
        });
        res.sendStatus(200);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
