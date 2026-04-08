import express from 'express';
import { models, sequelize } from '../models/index.js';
import { Op } from 'sequelize';
import { verifyToken, roleGuard } from '../middleware/verifyToken.js';
const router = express.Router();
const { DistributionConfig, PaymentDistribution, Program, Payment, Department, Student } = models;

// Finance: Set/Update Program Split
router.post('/configs', async (req, res) => {
  try {
    const { programId, universityShare, platformShare, partnerShare } = req.body;
    
    if (Number(universityShare) + Number(platformShare) + Number(partnerShare) !== 100) {
      return res.status(400).json({ error: 'Splits must sum to 100%' });
    }

    // Version Control: Deactivate current and create new
    await DistributionConfig.update({ isActive: false }, { where: { programId, isActive: true } });
    
    const latest = await DistributionConfig.findOne({ 
      where: { programId }, 
      order: [['version', 'DESC']] 
    });
    const nextVersion = (latest?.version || 0) + 1;

    const config = await DistributionConfig.create({
      programId,
      universityShare,
      platformShare,
      partnerShare,
      version: nextVersion,
      isActive: true
    });

    res.status(201).json(config);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Finance: Get Distribution Dashboard Data
router.get('/dashboard', verifyToken, roleGuard(['Finance Admin', 'Organization Admin', 'Organization Admin']), async (req, res) => {
  try {
    const programs = await Program.findAll({
      include: [
        { model: DistributionConfig, as: 'distributions', where: { isActive: true }, required: false }
      ]
    });
    
    // Aggregate metrics (Total Collected vs Distributed)
    const stats = await PaymentDistribution.findAll({
       attributes: [
         'partnerType',
         [sequelize.fn('SUM', sequelize.col('amount')), 'totalAmount'],
         [sequelize.fn('COUNT', sequelize.col('id')), 'count']
       ],
       group: ['partnerType']
    });

    res.json({ programs, stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Finance: Aging Report
router.get('/reports/aging', verifyToken, roleGuard(['Finance Admin', 'Organization Admin', 'Organization Admin']), async (req, res) => {
  try {
    const today = new Date();
    const centers = await Department.findAll({
      where: { type: 'partner-center' },
      attributes: ['name', ['id', 'uid']],
      include: [{
        model: Student,
        as: 'enrolledStudents',
        attributes: ['id', 'name', 'uid'],
        include: [{
           model: Payment,
           as: 'payments',
           where: { status: 'pending' }
        }]
      }]
    });

    const agingData = centers.map(center => {
      let current = 0, d30 = 0, d60 = 0, d90 = 0;
      
      center.enrolledStudents?.forEach(student => {
        student.payments?.forEach(payment => {
          const dueDate = new Date(payment.createdAt); // Assumption: createdAt is billing date
          const diffDays = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
          
          if (diffDays <= 0) current += Number(payment.amount);
          else if (diffDays <= 30) d30 += Number(payment.amount);
          else if (diffDays <= 60) d60 += Number(payment.amount);
          else d90 += Number(payment.amount);
        });
      });

      return {
        centerId: center.id,
        name: center.name,
        buckets: { current, d30, d60, d90 },
        total: current + d30 + d60 + d90
      };
    });

    res.json(agingData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Finance: University Payment Report & Cash Flow (90-day)
router.get('/reports/university/:id', verifyToken, roleGuard(['Finance Admin', 'Organization Admin', 'Organization Admin']), async (req, res) => {
  try {
    const university = await Department.findOne({ where: { id: req.params.id, type: 'university' } });
    if (!university) return res.status(404).json({ error: 'University not found' });

    // Total Owed vs Paid
    const distributions = await PaymentDistribution.findAll({
      where: { partnerType: 'university', partnerId: req.params.id }
    });
    
    const totalOwed = distributions.reduce((sum, d) => sum + Number(d.amount || 0), 0);
    const totalPaid = distributions.filter(d => d.status === 'distributed').reduce((sum, d) => sum + Number(d.amount || 0), 0);

    // Cash Flow Projection (Next 90 Days)
    const students = await Student.findAll({
       include: [{
          model: Program,
          where: { universityId: req.params.id }
       }]
    });

    const projections = {
      d30: (students?.length || 0) * 5000, 
      d60: (students?.length || 0) * 5200,
      d90: (students?.length || 0) * 4800
    };

    res.json({ university, totalOwed, totalPaid, pending: totalOwed - totalPaid, projections });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
