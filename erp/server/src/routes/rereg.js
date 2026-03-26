import express from 'express';
import { models } from '../models/index.js';
const router = express.Router();
const { ReregRequest, ReregConfig, Student, Program, Invoice, FeeSchema } = models;

// Center: Submit REREG for Student
router.post('/submit', async (req, res) => {
  try {
    const { studentId, targetSemester, targetYear, paymentProof, amountPaid, cycle } = req.body;
    
    // Check if configuration exists for program
    const student = await Student.findOne({ where: { uid: studentId }, include: [{ model: Program, as: 'program' }] });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const config = await ReregConfig.findOne({ where: { programId: student.programId, isActive: true } });
    
    const rereg = await ReregRequest.create({
      studentId,
      targetSemester,
      targetYear,
      paymentProof,
      amountPaid,
      cycle,
      status: 'pending'
    });

    // Auto-approval logic
    if (config && parseFloat(amountPaid) >= parseFloat(config.autoApprovalThreshold)) {
      // Trigger approval logic (duplicated for now or extract to helper)
      // For brevity, we'll mark as verified and the verify endpoint handles the heavy lifting
      rereg.status = 'verified';
      rereg.remarks = 'Auto-approved via threshold matching';
      await rereg.save();
    }

    res.status(201).json(rereg);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Finance: Verify REREG & Update Academic Record
router.post('/verify/:id', async (req, res) => {
  const t = await models.sequelize.transaction();
  try {
    const { status, remarks } = req.body; // verified / rejected
    const rereg = await ReregRequest.findByPk(req.params.id);
    if (!rereg) throw new Error('REREG Request not found');

    rereg.status = status;
    rereg.remarks = remarks;
    rereg.verifiedBy = req.user.uid;
    await rereg.save({ transaction: t });

    if (status === 'verified') {
      const student = await Student.findOne({ where: { uid: rereg.studentId }, transaction: t });
      if (!student) throw new Error('Student record lost');

      // 1. Increment Semester/Year
      student.semester = rereg.targetSemester;
      if (rereg.targetYear) student.year = rereg.targetYear;
      await student.save({ transaction: t });

      // 2. Generate New Invoice (GAP-1 Logic Sync)
      // Find active fee schema for student's program/semester
      const schema = await FeeSchema.findOne({ 
        where: { programId: student.programId, semester: student.semester },
        transaction: t
      });

      if (schema) {
         await Invoice.create({
           studentId: student.uid,
           totalAmount: schema.totalAmount,
           status: 'pending',
           type: 'rereg_fee',
           metadata: { cycle: rereg.cycle, schemaId: schema.id }
         }, { transaction: t });
      }
    }

    await t.commit();
    res.json(rereg);
  } catch (error) {
    await t.rollback();
    res.status(400).json({ error: error.message });
  }
});

// Finance: Get REREG Queue
router.get('/queue', async (req, res) => {
  try {
    const queue = await ReregRequest.findAll({
      where: { status: 'pending' },
      include: [{ model: Student, attributes: ['name', 'uid'] }]
    });
    res.json(queue);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Finance: Configuration
router.get('/config/all', async (req, res) => {
  try {
    const configs = await ReregConfig.findAll({
      include: [{ model: Program, as: 'program', attributes: ['name'] }]
    });
    res.json(configs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/config', async (req, res) => {
  try {
    const config = await ReregConfig.create(req.body);
    res.status(201).json(config);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
