import express from 'express';
import { models } from '../models/index.js';
import { Op } from 'sequelize';

const router = express.Router();
const { User, Department, Lead } = models;

// GET BDE Info for Public Form
router.get('/bde-info/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const bde = await User.findOne({
      where: { uid, role: 'sales' },
      attributes: ['uid', 'name'],
      include: [{
        model: Department,
        attributes: ['name']
      }]
    });

    if (!bde) {
      return res.status(404).json({ error: 'Sales representative not found' });
    }

    res.json(bde);
  } catch (error) {
    console.error('BDE Info Fetch Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST Register Center (Public)
router.post('/register-center', async (req, res) => {
  try {
    const { name, email, phone, bdeId, infrastructure, description } = req.body;

    if (!name || !phone || !bdeId) {
      return res.status(400).json({ error: 'Name, Phone, and BDE ID are required' });
    }

    // 1. Verify BDE
    const bde = await User.findOne({ where: { uid: bdeId, role: 'sales' } });
    if (!bde) {
      return res.status(400).json({ error: 'Invalid referral link' });
    }

    // 2. Create Lead for CRM tracking
    const lead = await Lead.create({
      name,
      email,
      phone,
      source: 'BDE Share Link',
      bdeId,
      status: 'NEW',
      notes: description || `Public registration via BDE link (${bde.name})`
    });

    // 3. Create Department record as 'LEAD' status
    const center = await Department.create({
      name,
      type: 'study-center',
      centerStatus: 'LEAD',
      status: 'active',
      bdeId,
      sourceLeadId: lead.id,
      infrastructureDetails: infrastructure || {},
      description
    });

    // Update lead with centerId link
    await lead.update({ centerId: center.id });

    res.status(201).json({ 
      success: true, 
      message: 'Registration successful. Our team will contact you shortly.',
      leadId: lead.id 
    });
  } catch (error) {
    console.error('Center Registration Error:', error);
    res.status(500).json({ error: 'Failed to process registration' });
  }
});

export default router;
