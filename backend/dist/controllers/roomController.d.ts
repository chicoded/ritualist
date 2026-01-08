import { type Request, type Response } from 'express';
import { type AuthRequest } from '../middleware/authMiddleware.js';
export declare const createRoom: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getRooms: (req: Request, res: Response) => Promise<void>;
export declare const getRecentPublicRooms: (_req: Request, res: Response) => Promise<void>;
export declare const getAllPublicRooms: (_req: Request, res: Response) => Promise<void>;
export declare const getMyRooms: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getRoomParticipants: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getRoomInfoForUser: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getRoomById: (req: AuthRequest, res: Response) => Promise<void>;
export declare const updateRoom: (req: AuthRequest, res: Response) => Promise<void>;
export declare const deleteRoom: (req: AuthRequest, res: Response) => Promise<void>;
export declare const joinRoom: (req: AuthRequest, res: Response) => Promise<void>;
export declare const leaveRoom: (req: AuthRequest, res: Response) => Promise<void>;
export declare const publishRoom: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=roomController.d.ts.map