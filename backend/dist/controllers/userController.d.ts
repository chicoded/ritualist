import { type Response } from 'express';
import { type AuthRequest } from '../middleware/authMiddleware.js';
export declare const updateMyAvatar: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getMyRecentPlayed: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getMyScore: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=userController.d.ts.map