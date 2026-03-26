import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { models } from '../models/index.js';
import { verifyToken } from '../middleware/verifyToken.js';
import validate from '../middleware/validate.js';
import { loginSchema } from '../lib/schemas.js';

const router = express.Router();
const { User } = models;

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
    
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account is suspended or inactive' });
    }

    const payload = {
      uid: user.uid,
      email: user.email,
      role: user.role,
      deptId: user.deptId,
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
    const { name, oldPassword, newPassword } = req.body;
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

    res.json({ message: 'Profile updated successfully', user: { name: user.name } });
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

export default router;
