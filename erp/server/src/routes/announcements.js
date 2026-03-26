import express from 'express';
import { models } from '../models/index.js';
import { Op } from 'sequelize';
import { logAction } from '../lib/audit.js';
import { verifyToken } from '../middleware/verifyToken.js';

const router = express.Router();
const { Announcement, AnnouncementRead, User, Program, Department } = models;

// HR: Get all announcements
router.get('/hr', async (req, res) => {
    try {
        const announcements = await Announcement.findAll({
            include: [{ model: User, as: 'author', attributes: ['name'] }],
            order: [['createdAt', 'DESC']]
        });
        res.json(announcements);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// HR: Post new announcement
router.post('/hr', async (req, res) => {
    try {
        const announcement = await Announcement.create({
            ...req.body,
            targetChannel: 'all_employees'
        });
        await logAction(req.user?.uid, 'CREATE_ANNOUNCEMENT', 'announcement', announcement.id, null, announcement, 'HR broadcast directive issued');
        res.status(201).json(announcement);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Ops: Get center announcements
router.get('/ops', async (req, res) => {
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
router.post('/ops', async (req, res) => {
    try {
        const announcement = await Announcement.create({
            ...req.body,
            targetChannel: 'centers_only'
        });
        await logAction(req.user?.uid, 'CREATE_OPS_ANNOUNCEMENT', 'announcement', announcement.id, null, announcement, 'Operations center-broadcast issued');
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

        if (role === 'center_admin') {
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
router.delete('/:id', async (req, res) => {
    try {
        const announcement = await Announcement.findByPk(req.params.id);
        await announcement.destroy();
        await logAction(req.user?.uid, 'DELETE_ANNOUNCEMENT', 'announcement', req.params.id, announcement, null, 'Institutional directive revoked');
        res.sendStatus(200);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
