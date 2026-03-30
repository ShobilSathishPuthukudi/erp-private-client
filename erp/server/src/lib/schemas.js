import { z } from 'zod';

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid institutional email format'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
  })
});

export const paymentSchema = z.object({
  body: z.object({
    studentId: z.number().int().positive(),
    amount: z.number().positive(),
    mode: z.string().min(2),
    date: z.string().optional(),
  })
});

export const employeeSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6).optional(),
    deptId: z.number().int().nullable().optional(),
    status: z.enum(['active', 'inactive', 'suspended']).optional(),
  })
});

export const leaveSchema = z.object({
  body: z.object({
    type: z.string(),
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
    reason: z.string().min(5),
  })
});

export const universitySchema = z.object({
  body: z.object({
    name: z.string().min(2),
    shortName: z.string().optional(),
    accreditation: z.string().optional(),
    websiteUrl: z.string().url().optional().or(z.literal('')),
    affiliationDoc: z.string().optional(),
    status: z.enum(['active', 'inactive']).optional(),
  })
});

export const programSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    shortName: z.string().optional(),
    universityId: z.coerce.number().int().positive().optional().nullable(),
    duration: z.coerce.number().int().positive(),
    intakeCapacity: z.coerce.number().int().positive().optional(),
    type: z.string().min(2),
    totalFee: z.coerce.number().nonnegative().optional(),
    paymentStructure: z.array(z.string()).optional(),
    tenure: z.coerce.number().int().positive().optional(),
  })
});
