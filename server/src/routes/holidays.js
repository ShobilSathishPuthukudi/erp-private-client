import express from 'express';
import { models } from '../models/index.js';
import { logAction } from '../lib/audit.js';
import { verifyToken } from '../middleware/verifyToken.js';

const router = express.Router();
const { Holiday, User, Notification } = models;

// HR: Get all holidays
router.get('/', async (req, res) => {
    try {
        const holidays = await Holiday.findAll({
            order: [['date', 'ASC']]
        });
        res.json(holidays);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// HR: Add holiday
router.post('/', verifyToken, async (req, res) => {
    try {
        const holiday = await Holiday.create(req.body);
        
        await logAction({
            userId: req.user.uid,
            action: 'CREATE_HOLIDAY',
            entity: 'Holiday',
            module: 'HR',
            details: `New institutional holiday certified: ${holiday.name}`,
            after: holiday
        });

        // BROADCAST: Notify all active users
        const users = await User.findAll({ where: { status: 'active' } });
        const notifications = users.map(u => ({
            userUid: u.uid,
            panelScope: 'employee',
            type: 'info',
            message: `Institutional Holiday: ${holiday.name} on ${new Date(holiday.date).toLocaleDateString()}. ${holiday.description || ''}`,
            link: '/dashboard/employee' // Adjust as needed
        }));

        await models.Notification.bulkCreate(notifications);

        res.status(201).json(holiday);
    } catch (error) {
        console.error('Holiday Creation Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// HR: Delete holiday
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const holiday = await Holiday.findByPk(req.params.id);
        await holiday.destroy();
        await logAction({
            userId: req.user.uid,
            action: 'DELETE_HOLIDAY',
            entity: 'Holiday',
            module: 'HR',
            details: `Institutional holiday revoked: ${holiday?.title}`,
            before: holiday
        });
        res.sendStatus(200);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
