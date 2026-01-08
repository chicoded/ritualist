import { type Response } from 'express';
import { type AuthRequest } from '../middleware/authMiddleware.js';
export declare const addQuestion: (req: AuthRequest, res: Response) => Promise<void>;
export declare const deleteQuestion: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getQuestions: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=questionController.d.ts.map