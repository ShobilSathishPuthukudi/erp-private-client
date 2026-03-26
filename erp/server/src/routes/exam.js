import express from 'express';
import { models } from '../models/index.js';
import { verifyToken } from '../middleware/verifyToken.js';

const router = express.Router();
const { Exam, Mark, Result, Student, Program, Department } = models;

const isSubDeptOrAcademic = (req, res, next) => {
  const allowed = ['academic', 'openschool', 'online', 'skill', 'bvoc'];
  if (!allowed.includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied: Academic or Sub-Dept privileges required' });
  }
  next();
};

const calculateGrade = (total) => {
    if (total >= 90) return 'A+';
    if (total >= 80) return 'A';
    if (total >= 70) return 'B';
    if (total >= 60) return 'C';
    if (total >= 50) return 'D';
    return 'F';
};

// --- Exam Management ---

router.get('/', verifyToken, isSubDeptOrAcademic, async (req, res) => {
  try {
    const where = {};
    if (req.user.role !== 'academic') {
        where.subDeptId = req.user.deptId;
    }
    const exams = await Exam.findAll({
      include: [{ model: Program, where, attributes: ['name', 'type'] }],
      order: [['createdAt', 'DESC']]
    });
    res.json(exams);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch exam registry' });
  }
});

router.post('/', verifyToken, isSubDeptOrAcademic, async (req, res) => {
  try {
    const { name, programId, batch, date } = req.body;
    const exam = await Exam.create({ name, programId, batch, date });
    res.status(201).json(exam);
  } catch (error) {
    res.status(500).json({ error: 'Failed to schedule examination' });
  }
});

router.put('/:id/status', verifyToken, isSubDeptOrAcademic, async (req, res) => {
  try {
    const { status } = req.body;
    const exam = await Exam.findByPk(req.params.id);
    if (!exam) return res.status(404).json({ error: 'Exam not found' });

    await exam.update({ status });
    res.json(exam);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update exam status' });
  }
});

// --- Marks Ingestion ---

router.post('/:id/marks-bulk', verifyToken, isSubDeptOrAcademic, async (req, res) => {
  try {
    const { id } = req.params;
    const { marks } = req.body; // Array of { studentId, subjectName, theory, practical, internal }

    const exam = await Exam.findByPk(id);
    if (!exam) return res.status(404).json({ error: 'Exam not found' });

    const records = marks.map(m => {
        const total = parseFloat(m.theory || 0) + parseFloat(m.practical || 0) + parseFloat(m.internal || 0);
        return {
            studentId: m.studentId,
            examId: id,
            subjectName: m.subjectName,
            theoryMarks: m.theory,
            practicalMarks: m.practical,
            internalMarks: m.internal,
            totalMarks: total,
            grade: calculateGrade(total)
        };
    });

    await Mark.bulkCreate(records, { updateOnDuplicate: ['theoryMarks', 'practicalMarks', 'internalMarks', 'totalMarks', 'grade'] });

    res.json({ message: `Successfully ingested marks for ${records.length} students` });
  } catch (error) {
    console.error('Bulk marks ingestion error:', error);
    res.status(500).json({ error: 'Failed to process academic marksheet' });
  }
});

// --- Results & Transcripts ---

router.get('/student/:studentId/transcript', verifyToken, async (req, res) => {
  try {
    const { studentId } = req.params;
    
    // Authorization check: Student can only see their own, Admin can see all
    if (req.user.role === 'student' && req.user.uid !== `STU${studentId}`) {
        return res.status(403).json({ error: 'Unauthorized transcript access' });
    }

    const marks = await Mark.findAll({
      where: { studentId },
      include: [{ model: Exam, attributes: ['name', 'batch', 'status'] }],
      order: [[Exam, 'date', 'DESC']]
    });

    const results = await Result.findAll({
      where: { studentId },
      order: [['semester', 'ASC']]
    });

    res.json({ marks, results });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch academic transcript' });
  }
});

export default router;
