import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { verifyToken } from '../middleware/verifyToken.js';

const router = express.Router();

const storage = multer.memoryStorage();

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }
});

router.post('/', verifyToken, upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Since we are debugging the hang, let's manually write the file for now to unblock the user
    const dir = path.resolve(process.cwd(), 'uploads', 'documents');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    
    const fileName = `${req.user?.uid || 'anonymous'}-${Date.now()}${path.extname(req.file.originalname)}`;
    const filePath = path.join(dir, fileName);
    
    fs.writeFileSync(filePath, req.file.buffer);

    res.status(201).json({ 
      message: 'File uploaded successfully', 
      filePath: `/uploads/documents/${fileName}` 
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

export default router;
