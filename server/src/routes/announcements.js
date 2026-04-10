import express from 'express';
import { models, sequelize } from '../models/index.js';
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
                { model: Program, as: 'program', attributes: ['name'], required: false },
                { model: Department, as: 'university', attributes: ['name'], required: false },
                { model: Department, as: 'center', attributes: ['name'], required: false }
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
        if (req.body.centerId) {
            const center = await Department.findByPk(req.body.centerId);
            if (!center || center.status !== 'active') {
                return res.status(400).json({ error: 'Institutional Guardrail: Operational directives can only be issued to centers in the [ACTIVE] governance stage.' });
            }
        }

        const announcement = await Announcement.create({
            ...req.body,
            authorId: req.user.uid,
            universityId: req.user.deptId || null, // Capture issuing department for categorization
            targetChannel: 'centers_only'
        });

        const centerUsers = await User.findAll({
            where: { role: ['Partner Center'] }
        });

        for (const u of centerUsers) {
            await createNotification(null, {
                targetUid: u.uid,
                type: announcement.priority === 'urgent' ? 'warning' : 'info',
                message: `New Directive: ${announcement.title}`,
                link: '/dashboard/partner-center/announcements'
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
        const now = new Date();
        const baseWhere = {
            [Op.and]: [
                {
                    [Op.or]: [
                        { expiryDate: null },
                        { expiryDate: { [Op.gt]: now } }
                    ]
                }
            ]
        };

        const roleLower = role?.toLowerCase();
        const isCenter = ['partner center', 'partner centers', 'center'].includes(roleLower);

        if (isCenter && deptId) {
            // Centers see Ops announcements matching their parameters or global ones
            baseWhere[Op.and].push({
                targetChannel: { [Op.in]: ['all_employees', 'centers_only'] }
            });
            
            const centerFilters = [
                { centerId: null, universityId: null, programId: null }, // Global
                { centerId: deptId } // Specific center
            ];

            // Safely add literal subqueries only if deptId exists
            try {
                centerFilters.push({ 
                    universityId: { [Op.in]: sequelize.literal(`(SELECT parentId FROM departments WHERE id = ${deptId})`) } 
                });
                centerFilters.push({ 
                    programId: { [Op.in]: sequelize.literal(`(SELECT programId FROM center_programs WHERE centerId = ${deptId} AND isActive = true)`) } 
                });
            } catch (litErr) {
                console.warn('[ANNOUNCEMENTS FEED] Literal subquery expansion skipped:', litErr.message);
            }

            baseWhere[Op.and].push({ [Op.or]: centerFilters });
        } else {
            // Internal staff/Admins see global announcements
            baseWhere[Op.and].push({ targetChannel: 'all_employees' });
        }

        const announcements = await Announcement.findAll({
            where: baseWhere,
            include: [
                { 
                    model: AnnouncementRead, 
                    as: 'reads', 
                    where: { userId: uid || 'GUEST' }, 
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
        console.error('[ANNOUNCEMENTS FEED ERROR]:', error);
        res.status(500).json({ 
            error: 'Failed to aggregate institutional feed',
            details: error.message 
        });
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
