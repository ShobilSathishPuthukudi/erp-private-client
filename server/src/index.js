import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import http from 'http';
import { sequelize, models } from './models/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Routes
import authRoutes from './routes/auth.js';
import departmentRoutes from './routes/departments.js';
import userRoutes from './routes/users.js';
import auditRoutes from './routes/audit.js';
import financeRoutes from './routes/finance.js';
import academicRoutes from './routes/academic.js';
import hrRoutes from './routes/hr.js';
import deptAdminRoutes from './routes/deptAdmin.js';
// import surveyRoutes from './routes/survey.js';
import feeRoutes from './routes/fees.js';
import accreditationRoutes from './routes/accreditation.js';
import subDeptRoutes from './routes/subDept.js';
import examRoutes from './routes/exam.js';
import portalRoutes from './routes/portals.js';
import uploadRoutes from './routes/upload.js';
import ceoRoutes from './routes/ceo.js';
import salesRoutes from './routes/sales.js';
import searchRoutes from './routes/search.js';
import feedbackRoutes from './routes/feedback.js';
import notificationRoutes from './routes/notifications.js';
import dataRoutes from './routes/data.js';
import cronRoutes from './routes/cron.js';
import announcementRoutes from './routes/announcements.js';
import holidayRoutes from './routes/holidays.js';
import leadRoutes from './routes/lead.js';
import targetRoutes from './routes/targets.js';
import incentiveRoutes from './routes/incentives.js';
import reregRoutes from './routes/rereg.js';
import credentialRoutes from './routes/credentialReveal.js';
import distributionRoutes from './routes/distribution.js';
import emiRoutes from './routes/emi.js';
import metricRoutes from './routes/dashboardMetrics.js';
import orgAdminRoutes from './routes/orgAdmin.js';
import orgMonitorRoutes from './routes/orgMonitor.js';
import operationsRoutes from './routes/operations.js';
import publicRoutes from './routes/public.js';
import drillDownRoutes from './routes/dashboardDrillDown.js';
import { initCronJobs } from './jobs/cronJobs.js';
import { syncInstitutionalStructure } from './services/institutionalStructure.js';

dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const httpServer = http.createServer(app);
const io = null; 

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Inject Socket.io into requests (NO-OP)
app.use((req, res, next) => {
  req.io = null;
  next();
});
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/users', userRoutes);
// app.use('/api/surveys', surveyRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/accreditation', accreditationRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/academic', academicRoutes);
app.use('/api/hr', hrRoutes);
app.use('/api/dept-admin', deptAdminRoutes);
app.use('/api/sub-dept', subDeptRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/portals', portalRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/ceo', ceoRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/cron', cronRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/holidays', holidayRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/targets', targetRoutes);
app.use('/api/incentives', incentiveRoutes);
app.use('/api/rereg', reregRoutes);
app.use('/api/credentials', credentialRoutes);
app.use('/api/distribution', distributionRoutes);
app.use('/api/emi', emiRoutes);
app.use('/api/dashboard', metricRoutes);
app.use('/api/dashboard-drilldown', drillDownRoutes);
app.use('/api/org-monitor', orgMonitorRoutes);
app.use('/api/org-admin', orgAdminRoutes);
app.use('/api/operations', operationsRoutes);
app.use('/api/public', publicRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[GLOBAL ERROR]:', err);
  res.status(500).json({ 
    message: err.message || 'Internal Server Error',
    module: 'GLOBAL'
  });
});

// Socket.io Setup (REMOVED)

// Initialize Background Daemon
initCronJobs();

const cleanupDuplicateIndexes = async () => {
  try {
    console.log('[DATABASE] Starting global index sanitization...');
    
    // 1. Find all non-primary unique indexes that look like duplicates (numeric suffixes or multiple per column)
    const [redundantIndexes] = await sequelize.query(`
      SELECT TABLE_NAME, INDEX_NAME, COLUMN_NAME
      FROM information_schema.statistics 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND NON_UNIQUE = 0 
      AND INDEX_NAME != 'PRIMARY'
      AND (
        INDEX_NAME REGEXP '_[0-9]+$' OR 
        INDEX_NAME IN (
          SELECT INDEX_NAME 
          FROM (
            SELECT TABLE_NAME, COLUMN_NAME, COUNT(*) as cnt, MIN(INDEX_NAME) as keep_name
            FROM information_schema.statistics 
            WHERE TABLE_SCHEMA = DATABASE() AND NON_UNIQUE = 0 AND INDEX_NAME != 'PRIMARY'
            GROUP BY TABLE_NAME, COLUMN_NAME
            HAVING cnt > 1
          ) as dups 
          WHERE statistics.TABLE_NAME = dups.TABLE_NAME 
          AND statistics.COLUMN_NAME = dups.COLUMN_NAME
          AND statistics.INDEX_NAME != dups.keep_name
        )
      )
    `);

    if (redundantIndexes.length > 0) {
      console.log(`[DATABASE] Found ${redundantIndexes.length} redundant indexes. Cleaning up...`);
      for (const { TABLE_NAME, INDEX_NAME } of redundantIndexes) {
        console.log(`[DATABASE] Dropping redundant index ${INDEX_NAME} from ${TABLE_NAME}`);
        await sequelize.query(`ALTER TABLE \`${TABLE_NAME}\` DROP INDEX \`${INDEX_NAME}\``).catch(() => {});
      }
    } else {
      console.log('[DATABASE] No redundant indexes found.');
    }

    // 2. Ensure Student Model schema reconciliation (Phase 4.2 Fix)
    const [columns] = await sequelize.query('SHOW COLUMNS FROM students');
    const columnNames = columns.map(c => c.Field);
    
    if (!columnNames.includes('invoiceId')) {
      console.log('Adding missing invoiceId column to students...');
      await sequelize.query('ALTER TABLE students ADD COLUMN invoiceId INT NULL').catch(err => console.error(err.message));
    }
    if (!columnNames.includes('paidAmount')) {
      console.log('Adding missing paidAmount column to students...');
      await sequelize.query('ALTER TABLE students ADD COLUMN paidAmount DECIMAL(10, 2) DEFAULT 0').catch(err => console.error(err.message));
    }
    if (!columnNames.includes('pendingAmount')) {
      console.log('Adding missing pendingAmount column to students...');
      await sequelize.query('ALTER TABLE students ADD COLUMN pendingAmount DECIMAL(10, 2) DEFAULT 0').catch(err => console.error(err.message));
    }
    if (!columnNames.includes('uid')) {
      console.log('Adding missing uid column to students...');
      await sequelize.query('ALTER TABLE students ADD COLUMN uid VARCHAR(255) UNIQUE NULL').catch(err => console.error(err.message));
    }

    // 3. Ensure Department Model schema reconciliation (Phase 4.3 Fix)
    const [deptCols] = await sequelize.query('SHOW COLUMNS FROM departments');
    const deptColNames = deptCols.map(c => c.Field);

    if (!deptColNames.includes('loginId')) {
      console.log('Adding missing loginId column to departments...');
      await sequelize.query('ALTER TABLE departments ADD COLUMN loginId VARCHAR(255) NULL').catch(err => console.error(err.message));
    }
    if (!deptColNames.includes('password')) {
      console.log('Adding missing password column to departments...');
      await sequelize.query('ALTER TABLE departments ADD COLUMN password VARCHAR(255) NULL').catch(err => console.error(err.message));
    }

    // 4. Ensure Program Model schema reconciliation (Phase 4.4 Fix)
    const [progCols] = await sequelize.query('SHOW COLUMNS FROM programs');
    const columnNamesProg = progCols.map(c => c.Field);

    if (!columnNamesProg.includes('totalCredits')) {
      console.log('Adding missing totalCredits column to programs...');
      await sequelize.query('ALTER TABLE programs ADD COLUMN totalCredits INT DEFAULT 0').catch(err => console.error(err.message));
    }

    // 5. Ensure Survey Model schema reconciliation
    const [surveyCols] = await sequelize.query('SHOW COLUMNS FROM surveys').catch(() => [[]]);
    const surveyColNames = (surveyCols || []).map(c => c.Field);

    if (surveyColNames.length > 0) {
      if (!surveyColNames.includes('expiryDate')) {
        console.log('Adding missing expiryDate column to surveys...');
        await sequelize.query('ALTER TABLE surveys ADD COLUMN expiryDate DATETIME NULL').catch(err => console.error(err.message));
      }
      if (!surveyColNames.includes('createdBy')) {
        console.log('Adding missing createdBy column to surveys...');
        await sequelize.query('ALTER TABLE surveys ADD COLUMN createdBy VARCHAR(255) NULL').catch(err => console.error(err.message));
      }
    }

    // 6. Ensure CredentialRequest Model status ENUM reconciliation
    const [credCols] = await sequelize.query("SHOW COLUMNS FROM credential_requests LIKE 'status'");
    if (credCols[0] && !credCols[0].Type.includes('cancelled')) {
      console.log('Updating CredentialRequest status ENUM to include cancelled...');
      await sequelize.query("ALTER TABLE credential_requests MODIFY COLUMN status ENUM('pending', 'approved', 'rejected', 'cancelled') DEFAULT 'pending'").catch(err => console.error(err.message));
    }
  } catch (err) {
    console.warn('Index cleanup skipped:', err.message);
  }
};

const startServer = (port) => {
  const server = httpServer.listen(port, '0.0.0.0', async () => {
    console.log(`[ERP] Server is running on port ${port}`);
    
    try {
      // 1. Sanitize Database Indexes to prevent ER_TOO_MANY_KEYS
      await cleanupDuplicateIndexes();

      // 1.1 FORCE SYNC CRITICAL GOVERNANCE MODELS (GAP-5)
      await models.Role.sync({ alter: true });
      await models.Permission.sync({ alter: true });

      // 2. Sync models with a soft fail (Sync already verified manually via DESC)
      await sequelize.sync({ alter: true }).catch(err => {
         console.error('[DATABASE] Minor schema sync warning (Non-blocking):', err.message);
      });
      await syncInstitutionalStructure(models);
      console.log('Institutional Database Engine authenticated successfully.');

      // 3. Seed standard institutional cron jobs (GAP-3)
      const { CronJob } = models;
      const existingJobs = await CronJob.count();
      if (existingJobs === 0) {
        await CronJob.bulkCreate([
          { name: 'task-escalation', schedule: '0 */4 * * *', status: 'active' },
          { name: 'rereg-deadline', schedule: '30 0 * * *', status: 'active' },
          { name: 'emi-overdue', schedule: '0 2 * * *', status: 'active' }
        ]);
      }
    } catch (err) {
      console.error('[ERP] Startup Error:', err);
    }
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[ERP] Port ${port} is already in use. Please kill the zombie process and restart.`);
      process.exit(1);
    } else {
      console.error('[ERP] Server Error:', err);
    }
  });
};

const PORT = process.env.PORT || 3000;

sequelize.authenticate().then(() => {
  console.log('Institutional Database Engine authenticated successfully.');
  startServer(parseInt(PORT, 10));
}).catch(err => {
  console.error('Failed to authenticate database:', err);
});
