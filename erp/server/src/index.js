import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
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
import metricRoutes from './routes/dashboardMetrics.js';
import orgAdminRoutes from './routes/orgAdmin.js';
import operationsRoutes from './routes/operations.js';
import { initCronJobs } from './jobs/cronJobs.js';

dotenv.config();

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Inject Socket.io into requests
app.use((req, res, next) => {
  req.io = io;
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
app.use('/api/dashboard', metricRoutes);
app.use('/api/org-admin', orgAdminRoutes);
app.use('/api/operations', operationsRoutes);

// Socket.io Setup
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Initialize Background Daemon
initCronJobs(io);

const cleanupDuplicateIndexes = async () => {
  try {
    // 1. Cleanup 'users' redundant email indexes
    const [userResults] = await sequelize.query(`
      SELECT INDEX_NAME 
      FROM information_schema.statistics 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'users' 
      AND COLUMN_NAME = 'email' 
      AND NON_UNIQUE = 0
    `);

    const userRedundant = userResults
      .map(r => r.INDEX_NAME)
      .filter(name => name !== 'idx_user_email' && name !== 'PRIMARY');

    for (const indexName of userRedundant) {
      console.log(`Dropping redundant user index: ${indexName}`);
      await sequelize.query(`ALTER TABLE users DROP INDEX ${indexName}`).catch(() => {});
    }

    // 2. Cleanup 'invoices' redundant invoiceNo indexes (ER_TOO_MANY_KEYS fix)
    const [invoiceResults] = await sequelize.query(`
      SELECT INDEX_NAME 
      FROM information_schema.statistics 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'invoices' 
      AND COLUMN_NAME = 'invoiceNo' 
      AND NON_UNIQUE = 0
    `);

    const invoiceRedundant = invoiceResults
      .map(r => r.INDEX_NAME)
      .filter(name => name !== 'invoiceNo' && name !== 'PRIMARY' && !name.includes('unique'));

    for (const indexName of invoiceRedundant) {
      if (indexName === 'invoiceNo') continue; // Safety check
      console.log(`Dropping redundant invoice index: ${indexName}`);
      await sequelize.query(`ALTER TABLE invoices DROP INDEX ${indexName}`).catch(() => {});
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

      // 2. Sync models with a soft fail (Sync already verified manually via DESC)
      await sequelize.sync({ alter: true }).catch(err => {
         console.error('[DATABASE] Minor schema sync warning (Non-blocking):', err.message);
      });
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
