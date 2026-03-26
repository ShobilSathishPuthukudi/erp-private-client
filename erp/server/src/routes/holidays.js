import express from 'express';
import { models } from '../models/index.js';
import { logAction } from '../lib/audit.js';

const router = express.Router();
const { Holiday } = models;

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
router.post('/', async (req, res) => {
    try {
        const holiday = await Holiday.create(req.body);
        await logAction(req.user?.uid, 'CREATE_HOLIDAY', 'holiday', holiday.id, null, holiday, 'New institutional holiday certified');
        res.status(201).json(holiday);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// HR: Delete holiday
router.delete('/:id', async (req, res) => {
    try {
        const holiday = await Holiday.findByPk(req.params.id);
        await holiday.destroy();
        await logAction(req.user?.uid, 'DELETE_HOLIDAY', 'holiday', req.params.id, holiday, null, 'Institutional holiday revoked');
        res.sendStatus(200);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
