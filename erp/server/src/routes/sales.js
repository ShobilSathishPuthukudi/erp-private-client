import express from 'express';
import { models, sequelize } from '../models/index.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();
const { Lead, Department, Student, Payment, User } = models;

// GET Sales Performance Overview
router.get('/performance', authenticate, authorize('sales', 'org-admin', 'finance'), async (req, res) => {
  try {
    const bdeId = req.user.role === 'sales' ? req.user.uid : req.query.bdeId;
    
    // Centers referred by this BDE
    const centers = await Department.findAll({
      where: { bdeId, type: 'study-center' },
      attributes: ['id', 'name', 'status', 'createdAt']
    });

    const centerIds = centers.map(c => c.id);

    // Students enrolled from these centers
    const studentCount = await Student.count({
      where: { deptId: centerIds }
    });

    // Revenue generated (Total successful payments from these students)
    const revenue = await Payment.sum('amount', {
      where: { 
        status: 'success',
        studentId: await Student.findAll({ 
            where: { deptId: centerIds }, 
            attributes: ['id'] 
        }).then(students => students.map(s => s.id))
      }
    });

    res.json({
      centerCount: centers.length,
      studentCount,
      totalRevenue: revenue || 0,
      centers: centers.map(c => ({
        ...c.dataValues,
        revenue: 0 // In a real system, you'd aggregate revenue per center here
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET unique referral code for current BDE
router.get('/referral-code', authenticate, authorize('sales'), async (req, res) => {
  try {
    let user = await User.findByPk(req.user.uid);
    if (!user.referralCode) {
      user.referralCode = `BDE-${user.name.substring(0, 3).toUpperCase()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      await user.save();
    }
    res.json({ referralCode: user.referralCode });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
