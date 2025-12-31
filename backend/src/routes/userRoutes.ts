import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { updateMyAvatar } from '../controllers/userController.js';

const router = express.Router();

router.patch('/me/avatar', authenticateToken, updateMyAvatar);

export default router;
