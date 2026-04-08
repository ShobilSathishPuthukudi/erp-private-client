import express from 'express';
import { Op } from 'sequelize';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { sequelize, models } from '../models/index.js';
import { verifyToken } from '../middleware/verifyToken.js';
import validate from '../middleware/validate.js';
import { loginSchema } from '../lib/schemas.js';

const { User, Department, Student } = models;
const router = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(process.cwd(), 'uploads/avatars');
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, req.user.uid + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB Limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'));
    }
  }
});

router.post('/login', validate(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ 
      where: { 
        [Op.or]: [
          { email: email },
          { uid: email }
        ]
      },
      include: [{ model: Department, as: 'department', attributes: ['name'] }]
    });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ 
        error: 'Institutional Access Denied: This account has been suspended or deactivated by the governance system. (Authority Succession)' 
      });
    }

    // Double-Layer Verification for Partner Centers
    if (user.role?.toLowerCase()?.includes('partner center')) {
      const dept = await Department.findByPk(user.deptId);
      if (!dept || dept.status !== 'active' || dept.auditStatus !== 'approved') {
        const auditDetail = !dept ? 'Institutional record not found' : `Status: ${dept.status}, Audit: ${dept.auditStatus}`;
        console.warn(`[SECURITY] Blocked login attempt for unverified center ${user.uid} (${auditDetail})`);
        
        return res.status(403).json({ 
          error: 'Institutional Access Denied: Your partner center is currently awaiting administrative ratification or financial clearance. Access is restricted until the audit process is completed.' 
        });
      }
    }

    const isManager = await User.count({ where: { reportingManagerUid: user.uid, status: 'active' } }) > 0;

    const payload = {
      uid: user.uid,
      email: user.email,
      role: user.role,
      isManager,
      deptId: user.deptId,
      departmentName: user.role?.toLowerCase().includes('partner center')
        ? 'Partner Center Hub'
        : (user.department?.name 
          ? (user.department.name.toLowerCase().includes('department') ? user.department.name : `${user.department.name} Department`)
          : (user.subDepartment || 'Institutional Unit')),
      subDepartment: user.subDepartment,
      name: user.name,
      avatar: user.avatar
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '12h' });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 12 * 60 * 60 * 1000 // 12 hours
    });

    res.json({ user: payload, token });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

router.post('/update-profile', verifyToken, async (req, res) => {
  try {
    const { name, oldPassword, newPassword, phone, dateOfBirth, bio, address } = req.body;
    const userId = req.user.uid;

    const user = await User.findOne({ where: { uid: userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let updated = false;

    if (name && name.trim() !== '' && name !== user.name) {
      user.name = name.trim();
      updated = true;
    }

    if (oldPassword || newPassword) {
      if (!oldPassword) {
        return res.status(400).json({ error: 'Current password is required to set a new password' });
      }
      const isMatch = await bcrypt.compare(oldPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ error: 'Incorrect current password' });
      }
      if (newPassword) {
        user.password = await bcrypt.hash(newPassword, 10);
        updated = true;
      }
    }

    if (updated) {
      await user.save();
    }

    if (phone !== undefined && phone !== user.phone) {
      user.phone = phone;
      updated = true;
    }

    if (dateOfBirth !== undefined && dateOfBirth !== user.dateOfBirth) {
      user.dateOfBirth = dateOfBirth || null;
      updated = true;
    }

    if (bio !== undefined && bio !== user.bio) {
      user.bio = bio;
      updated = true;
    }

    if (address !== undefined && address !== user.address) {
      user.address = address;
      updated = true;
    }

    if (updated) {
      await user.save();
    }

    res.json({ message: 'Profile updated successfully', user: { name: user.name, phone: user.phone, dateOfBirth: user.dateOfBirth, bio: user.bio, address: user.address, avatar: user.avatar } });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/upload-avatar', verifyToken, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Must be an image under 5MB.' });
    }

    const userId = req.user.uid;
    const user = await User.findOne({ where: { uid: userId } });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const avatarUrl = 'http://localhost:3000/uploads/avatars/' + req.file.filename;
    
    user.avatar = avatarUrl;
    await user.save();

    res.json({ avatarUrl, message: 'Avatar updated successfully' });
  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

router.get('/demo-students', async (req, res) => {
  try {
    const students = await Student.findAll({
      where: { status: 'ENROLLED' },
      limit: 24,
      attributes: ['id', 'name', 'email'],
      order: [['createdAt', 'DESC']]
    });
    
    // Map to user-friendly credentials for the login popup
    const formatted = students.map(s => ({
      uid: `STU${s.id}`,
      name: s.name,
      email: s.email || `STU${s.id}@erp.com`

    }));

    res.json(formatted);
  } catch (error) {
    console.error('Demo Students Fetch Error:', error);
    res.status(500).json({ error: 'Failed to fetch enrolled student roster' });
  }
});

router.get('/recent-admins', async (req, res) => {
  try {
    const recentAdmins = await User.findAll({
      where: { 
        role: { [Op.notIn]: ['student', 'admin', 'ceo', 'Organization Admin', 'Organization Admin'] },
        status: 'active'
      },
      limit: 4,
      order: [['createdAt', 'DESC']],
      attributes: ['uid', 'name', 'email', 'role', 'devPassword']
    });

    const formatted = recentAdmins.map(u => ({
      uid: u.uid,
      name: u.name,
      email: u.email,
      role: u.role,
      password: u.devPassword || 'password123'
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Recent Admins Fetch Error:', error);
    res.status(500).json({ error: 'Failed to fetch recently provisioned admins' });
  }
});

router.get('/latest-center', async (req, res) => {
  try {
    const latestUser = await User.findOne({
      where: { 
        role: { [Op.in]: ['Partner Center'] },
        status: 'active' 
      },
      order: [['createdAt', 'DESC']],
      attributes: ['name', 'email']
    });

    if (!latestUser) return res.status(404).json({ error: 'No centers found' });
    res.json(latestUser);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch latest center' });
  }
});

router.get('/demo-centers', async (req, res) => {
  try {
    const centers = await User.findAll({
      where: { 
        role: { [Op.in]: ['Partner Center'] },
        status: 'active'
      },
      attributes: ['uid', 'name', 'email', 'devPassword'],
      order: [['name', 'ASC']]
    });
    
    const formatted = centers.map(c => ({
      uid: c.uid,
      name: c.name,
      email: c.email,
      password: c.devPassword || 'password123'
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Demo Centers Fetch Error:', error);
    res.status(500).json({ error: 'Failed to fetch verified center roster' });
  }
});

router.get('/demo-ceos', async (req, res) => {
  try {
    const { CEOPanel, User } = models;
    // Force schema consistency for the dev vault field
    await CEOPanel.sync({ alter: true });

    // Fetch all executive panels with their identity records
    const panels = await CEOPanel.findAll({
      include: [{ 
        model: User, 
        as: 'ceoUser', 
        attributes: ['uid', 'name', 'email'] 
      }],
      order: [['name', 'ASC']],
      raw: false // Need instances for associated access or use nested attributes
    });

    // Map to the standard identity payload used by the login quick-panel
    const formatted = panels.map(panel => {
      const user = panel.ceoUser || { 
        uid: panel.userId || `PANEL_${panel.id}`, 
        name: panel.name, 
        email: `ceo_${panel.id}@erp.com` 
 
      };

      return {
        uid: user.uid,
        name: panel.name, // Use panel name for better identification
        email: user.email,
        password: panel.devCredential || 'password123'
      };
    });

    res.json(formatted);
  } catch (error) {
    console.error('Executive Roster Critical Failure:', {
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ error: 'Failed to fetch executive roster', details: error.message });
  }
});

router.get('/demo-staff', async (req, res) => {
  try {
    const staff = await User.findAll({
      where: { 
        role: 'employee',
        status: 'active'
      },
      attributes: ['uid', 'name', 'email', 'role', 'devPassword'],
      include: [{ 
        model: Department, 
        attributes: ['name'] 
      }],
      limit: 30,
      order: [['name', 'ASC']]
    });

    const formatted = staff.map(s => ({
      uid: s.uid,
      name: s.name,
      email: s.email,
      role: s.role,
      department: s.Department?.name || 'Institutional Unit',
      password: s.devPassword || (s.name === 'Shobil Sathish' ? 'shobilsathish' : 'password123')
    }));
    
    res.json(formatted);
  } catch (error) {
    console.error('Demo Staff Fetch Error:', error);
    res.status(500).json({ error: 'Failed to fetch institutional staff roster' });
  }
});

router.get('/restore-demo', async (req, res) => {
  try {
    const { CenterProgram, Program, Announcement, Student } = models;
    const demoEmail = 'demo@erp.com';

    
    const t = await sequelize.transaction();
    try {
      // 1. Cleanup all existing demo artifacts to ensure a clean state
      // Use role and name filters to isolate Demo Org data
      const oldUser = await User.findOne({ where: { email: demoEmail }, transaction: t });
      if (oldUser) {
          // Delete dependent records first
          await models.Announcement.destroy({ where: { authorId: oldUser.uid }, transaction: t });
          await models.Student.destroy({ where: { centerId: oldUser.deptId }, transaction: t });
          await models.AdmissionSession.destroy({ where: { centerId: oldUser.deptId }, transaction: t });
          await CenterProgram.destroy({ where: { centerId: oldUser.deptId }, transaction: t });
          await oldUser.destroy({ transaction: t });
      }
      await Department.destroy({ where: { name: 'Demo Org' }, transaction: t });

      // 2. Reconstruct Infrastructure
      const center = await Department.create({
        name: 'Demo Org',
        shortName: 'DEMO',
        type: 'center',
        status: 'active',
        centerStatus: 'ACTIVE'
      }, { transaction: t });

      const allProgs = await Program.findAll({ transaction: t });
      const createdMappings = [];
      for (const prog of allProgs) {
        const m = await CenterProgram.create({
          centerId: center.id,
          programId: prog.id,
          subDeptId: prog.subDeptId || 1,
          isActive: true
        }, { transaction: t });
        createdMappings.push(m);
      }

      const demoUser = await User.create({ 
        uid: `CTR-DEMO-${Date.now().toString().slice(-4)}`, 
        name: 'Demo Org', 
        email: demoEmail, 
        password: await bcrypt.hash('password123', 10), 
        role: 'Partner Center', 
        deptId: center.id,
        status: 'active' 
      }, { transaction: t });

      await center.update({ adminId: demoUser.uid }, { transaction: t });

      // 3. Seed Announcements
      await Announcement.create({
        title: 'Welcome to the ERP Ecosystem',

        message: 'Your institutional center node is now successfully synchronized. You can now manage admissions, track student performance, and access forensic audit vaults.',
        priority: 'urgent',
        targetChannel: 'centers_only',
        authorId: demoUser.uid
      }, { transaction: t });

      // 4. Seed Dummy Student
      if (allProgs.length > 0) {
        await Student.create({
          name: 'Demo Student (Auto-Generated)',
          deptId: allProgs[0].universityId || 1,
          centerId: center.id,
          programId: allProgs[0].id,
          status: 'ENROLLED',
          enrollStatus: 'active'
        }, { transaction: t });
      }

      // 5. Seed Admission Session for testing
      if (allProgs.length > 0) {
        await models.AdmissionSession.create({
          name: 'Spring 2026 Batch',
          programId: allProgs[0].id,
          centerId: center.id,
          subDeptId: allProgs[0].subDeptId || 1,
          startDate: new Date(),
          endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
          maxCapacity: 100,
          isActive: true,
          approvalStatus: 'APPROVED'
        }, { transaction: t });
      }

      await t.commit();
      res.json({ success: true, message: 'Demo Org environment successfully reset with sessions and mappings.' });
    } catch (err) {
      await t.rollback();
      throw err;
    }
  } catch (error) {
    console.error('Restore Demo Error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
