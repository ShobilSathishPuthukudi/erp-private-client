import express from 'express';
import { models } from '../models/index.js';
import { verifyToken } from '../middleware/verifyToken.js';
import validate from '../middleware/validate.js';
import { z } from 'zod';
import { logAction } from '../lib/audit.js';

const router = express.Router();
const { Program, ProgramFee } = models;

const isFinance = (req, res, next) => {
  if (!['finance', 'org-admin', 'system-admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Finance privileges required' });
  }
  next();
};

const feeSchemaZod = z.object({
  body: z.object({
    programId: z.number().int().positive(),
    name: z.string().min(3),
    schema: z.object({
      type: z.enum(['semester', 'yearly', 'emi']),
      installments: z.array(z.object({
        label: z.string(),
        amount: z.number().positive(),
        dueDate: z.string().optional(),
      }))
    })
  })
});

router.post('/', verifyToken, isFinance, validate(feeSchemaZod), async (req, res) => {
  try {
    const { programId, name, schema } = req.body;
    
    const program = await Program.findByPk(programId);
    if (!program) return res.status(404).json({ error: 'Program not found' });

    // Create new version or first version
    const latestFee = await ProgramFee.findOne({
      where: { programId },
      order: [['version', 'DESC']]
    });

    const version = latestFee ? latestFee.version + 1 : 1;

    const newFee = await ProgramFee.create({
      programId,
      name,
      schema,
      version
    });

    // Automatically transition Program to Active if it was Draft
    if (program.status === 'draft') {
      await program.update({ status: 'active' });
    }

    await logAction({
      userId: req.user.uid,
      action: 'CREATE',
      entity: 'ProgramFee',
      details: `Defined fee schema ${name} (v${version}) for program ${program.name}`,
      module: 'Finance'
    });

    res.status(201).json(newFee);
  } catch (error) {
    console.error('Fee creation error:', error);
    res.status(500).json({ error: 'Failed to define fee schema' });
  }
});

router.get('/:programId', verifyToken, async (req, res) => {
  try {
    const fees = await ProgramFee.findAll({
      where: { programId: req.params.programId, isActive: true },
      order: [['version', 'DESC']]
    });
    res.json(fees);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch program fees' });
  }
});

export default router;
