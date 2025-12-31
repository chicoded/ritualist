import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

const uploadRoot = path.resolve(process.cwd(), 'uploads');
const questionDir = path.join(uploadRoot, 'questions');
const avatarDir = path.join(uploadRoot, 'avatars');
if (!fs.existsSync(uploadRoot)) fs.mkdirSync(uploadRoot);
if (!fs.existsSync(questionDir)) fs.mkdirSync(questionDir);
if (!fs.existsSync(avatarDir)) fs.mkdirSync(avatarDir);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, questionDir),
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname || '') || '.png';
    cb(null, `q-${unique}${ext}`);
  }
});

const upload = multer({ storage });

router.post('/question-image', authenticateToken, upload.single('image'), (req, res) => {
  if (!req.file) {
    res.status(400).json({ success: false, message: 'No image file uploaded' });
    return;
  }
  const urlPath = `/uploads/questions/${req.file.filename}`;
  res.json({ success: true, url: urlPath });
});

// Avatar upload
const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, avatarDir),
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname || '') || '.png';
    cb(null, `avatar-${unique}${ext}`);
  }
});
const avatarUpload = multer({ storage: avatarStorage });

router.post('/avatar-image', authenticateToken, avatarUpload.single('image'), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ success: false, message: 'No image file uploaded' });
    return;
  }
  const urlPath = `/uploads/avatars/${req.file.filename}`;
  // Optionally update user avatar_url
  try {
    const userId = (req as any).user?.id;
    if (userId) {
      await (await import('../config/db.js')).default.query('UPDATE users SET avatar_url = ? WHERE id = ?', [urlPath, userId]);
    }
  } catch {}
  res.json({ success: true, url: urlPath });
});

export default router;
