import { type Response } from 'express';
import pool from '../config/db.js';
import { type AuthRequest } from '../middleware/authMiddleware.js';

export const updateMyAvatar = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }
  const { avatarUrl } = req.body as { avatarUrl?: string };
  if (!avatarUrl || typeof avatarUrl !== 'string') {
    res.status(400).json({ success: false, message: 'avatarUrl is required' });
    return;
  }
  try {
    await pool.query('UPDATE users SET avatar_url = ? WHERE id = ?', [avatarUrl, req.user.id]);
    res.json({ success: true });
  } catch (e: any) {
    console.error('updateMyAvatar error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
