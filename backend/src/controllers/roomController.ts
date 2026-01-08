import { type Request, type Response } from 'express';
import pool from '../config/db.js';
import { type RowDataPacket, type ResultSetHeader } from 'mysql2';
import bcrypt from 'bcrypt';
import { type AuthRequest } from '../middleware/authMiddleware.js';

// Helper to generate a random room code (e.g., "AB12CD")
const generateRoomCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const createRoom = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  const { title, maxParticipants, timePerQuestion, isPublic, password, startTime, coverPhotoUrl } = req.body;

  if (!title) {
    res.status(400).json({ success: false, message: 'Room title is required' });
    return;
  }

  // If room is private, password is required
  if (isPublic === false && !password) {
    res.status(400).json({ success: false, message: 'Password is required for private rooms' });
    return;
  }

  try {
    let roomCode = generateRoomCode();
    let isUnique = false;

    // Ensure room code is unique
    while (!isUnique) {
      const [existing] = await pool.query<RowDataPacket[]>('SELECT id FROM rooms WHERE room_code = ?', [roomCode]);
      if (existing.length === 0) {
        isUnique = true;
      } else {
        roomCode = generateRoomCode();
      }
    }

    let passwordHash: string | null = null;
    if (!isPublic && password) {
        const salt = await bcrypt.genSalt(10);
        passwordHash = await bcrypt.hash(password, salt);
    }

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO rooms 
      (room_code, host_id, title, max_participants, time_per_question, is_public, password_hash, start_time, cover_photo_url) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        roomCode,
        req.user.id,
        title,
        maxParticipants || 50,
        timePerQuestion || 30,
        isPublic !== undefined ? isPublic : true,
        passwordHash,
        null,
        coverPhotoUrl || null
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Room created successfully',
      room: {
        id: result.insertId,
        roomCode,
        title,
        isPublic: isPublic !== undefined ? isPublic : true,
        startTime: null,
        coverPhotoUrl: coverPhotoUrl || null
      }
    });

  } catch (error: any) {
    console.error('Create Room Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

export const getRooms = async (req: Request, res: Response) => {
    try {
        // List rooms:
        // - Public: status must be 'published' and has questions
        // - Private: status 'waiting' AND start_time set AND has questions
        const [rooms] = await pool.query<RowDataPacket[]>(
            `SELECT r.id, r.room_code, r.title, r.max_participants, r.status, r.is_public, r.is_published, r.published_at, r.start_time, r.created_at, r.host_id, r.cover_photo_url,
            (SELECT COUNT(*) FROM participants p WHERE p.room_id = r.id) as participant_count
             FROM rooms r
             WHERE (
               r.is_public = 1 
               AND r.is_published = 1 
               AND (SELECT COUNT(*) FROM questions q WHERE q.room_id = r.id) > 0
             )
             OR (
               r.is_public = 0 
               AND LOWER(r.status) IN ('waiting','published')
               AND r.start_time IS NOT NULL 
               AND (SELECT COUNT(*) FROM questions q WHERE q.room_id = r.id) > 0
             )
             ORDER BY r.created_at DESC`
        );

        res.json({ success: true, rooms });
    } catch (error: any) {
        console.error('Get Rooms Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const getRecentPublicRooms = async (_req: Request, res: Response) => {
  try {
    const [rooms] = await pool.query<RowDataPacket[]>(
      `SELECT r.id, r.room_code, r.title, r.published_at, r.created_at, r.cover_photo_url,
              (SELECT COUNT(*) FROM participants p WHERE p.room_id = r.id) AS participant_count
       FROM rooms r
       WHERE r.is_public = 1 AND COALESCE(r.is_published, 0) = 1
       ORDER BY r.published_at DESC, r.created_at DESC
       LIMIT 20`
    );
    res.json({ success: true, rooms });
  } catch (error: any) {
    console.error('Get Recent Public Rooms Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getAllPublicRooms = async (_req: Request, res: Response) => {
  try {
    const [rooms] = await pool.query<RowDataPacket[]>(
      `SELECT r.id, r.room_code, r.title, r.published_at, r.created_at, r.cover_photo_url,
              (SELECT COUNT(*) FROM participants p WHERE p.room_id = r.id) AS participant_count
       FROM rooms r
       WHERE r.is_public = 1 AND COALESCE(r.is_published, 0) = 1
       ORDER BY r.published_at DESC, r.created_at DESC`
    );
    res.json({ success: true, rooms });
  } catch (error: any) {
    console.error('Get All Public Rooms Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getMyRooms = async (req: AuthRequest, res: Response) => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }

    try {
        const [rooms] = await pool.query<RowDataPacket[]>(
            `SELECT r.*, (SELECT COUNT(*) FROM participants p WHERE p.room_id = r.id) as participant_count
             FROM rooms r WHERE r.host_id = ? ORDER BY r.created_at DESC`,
            [req.user.id]
        );
        res.json({ success: true, rooms });
    } catch (error: any) {
        console.error('Get My Rooms Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const getRoomParticipants = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    try {
        const [participants] = await pool.query<RowDataPacket[]>(
            `SELECT u.id, u.username, p.joined_at 
             FROM participants p 
             JOIN users u ON p.user_id = u.id 
             WHERE p.room_id = ? 
             ORDER BY p.joined_at DESC`,
            [id]
        );
        res.json({ success: true, participants });
    } catch (error: any) {
        console.error('Get Participants Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const getRoomInfoForUser = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }
  const { id } = req.params;
  try {
    const [rooms] = await pool.query<RowDataPacket[]>(
      'SELECT id, title, is_public, time_per_question, start_time, host_id FROM rooms WHERE id = ?', [id]
    );
    if (!rooms || rooms.length === 0) {
      res.status(404).json({ success: false, message: 'Room not found' });
      return;
    }
    const room = rooms[0] as RowDataPacket;
    const [qRows] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) AS total FROM questions WHERE room_id = ?', [id]);
    const total = Number((qRows[0] as any).total) || 0;
    const [aRows] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) AS answered FROM answers WHERE room_id = ? AND user_id = ?', [id, req.user.id]
    );
    const answered = Number((aRows[0] as any).answered) || 0;
    const [scoreRows] = await pool.query<RowDataPacket[]>(
      'SELECT total_score, position FROM participants WHERE room_id = ? AND user_id = ?', [id, req.user.id]
    );
    const total_score = scoreRows.length ? (scoreRows[0] as any).total_score : 0;
    const position = scoreRows.length ? (scoreRows[0] as any).position : null;
    res.json({ success: true, room: room, total, answered, completed: answered >= total, total_score, position });
  } catch (error: any) {
    console.error('Get Room Info Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getRoomById = async (req: AuthRequest, res: Response) => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }
    
    const { id } = req.params;

    try {
        const [rooms] = await pool.query<RowDataPacket[]>('SELECT * FROM rooms WHERE id = ?', [id]);
        
        if (!rooms || rooms.length === 0) {
            res.status(404).json({ success: false, message: 'Room not found' });
            return;
        }

        const room = rooms[0] as RowDataPacket;
        
        // Allow host to see, and allow participants to see
        if (room.host_id !== req.user.id) {
            const [part] = await pool.query<RowDataPacket[]>(
              'SELECT 1 FROM participants WHERE user_id = ? AND room_id = ?',
              [req.user.id, id]
            );
            if (!part || part.length === 0) {
              res.status(403).json({ success: false, message: 'Not authorized' });
              return;
            }
        }

        res.json({ success: true, room: room });
    } catch (error: any) {
        console.error('Get Room By ID Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const updateRoom = async (req: AuthRequest, res: Response) => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }

    const { id } = req.params;
    const { title, maxParticipants, timePerQuestion, isPublic, password, startTime, coverPhotoUrl } = req.body;

    try {
        // Verify ownership
        const [rooms] = await pool.query<RowDataPacket[]>('SELECT host_id FROM rooms WHERE id = ?', [id]);
        
        if (!rooms || rooms.length === 0) {
            res.status(404).json({ success: false, message: 'Room not found' });
            return;
        }

        const room = rooms[0] as RowDataPacket;

        if (room.host_id !== req.user.id) {
            res.status(403).json({ success: false, message: 'Not authorized' });
            return;
        }

        // Prepare update query
        let query = 'UPDATE rooms SET title = ?, max_participants = ?, time_per_question = ?, is_public = ?, start_time = ?';
        const params: any[] = [title, maxParticipants, timePerQuestion, isPublic, startTime || null];

        if (password) {
             const salt = await bcrypt.genSalt(10);
             const passwordHash = await bcrypt.hash(password, salt);
             query += ', password_hash = ?';
             params.push(passwordHash);
        }

        if (coverPhotoUrl !== undefined) {
            query += ', cover_photo_url = ?';
            params.push(coverPhotoUrl || null);
        }
        query += ' WHERE id = ?';
        params.push(id);

        await pool.query(query, params);

        res.json({ success: true, message: 'Room updated successfully' });

    } catch (error: any) {
        console.error('Update Room Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const deleteRoom = async (req: AuthRequest, res: Response) => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }

    const { id } = req.params;

    try {
        const [rooms] = await pool.query<RowDataPacket[]>('SELECT host_id FROM rooms WHERE id = ?', [id]);
        
        if (!rooms || rooms.length === 0) {
            res.status(404).json({ success: false, message: 'Room not found' });
            return;
        }

        const room = rooms[0] as RowDataPacket;

        if (room.host_id !== req.user.id) {
            res.status(403).json({ success: false, message: 'Not authorized' });
            return;
        }

        await pool.query('DELETE FROM rooms WHERE id = ?', [id]);
        res.json({ success: true, message: 'Room deleted successfully' });

    } catch (error: any) {
        console.error('Delete Room Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const joinRoom = async (req: AuthRequest, res: Response) => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }

    const { id } = req.params;
    const { password } = req.body;

    try {
    const [rooms] = await pool.query<RowDataPacket[]>('SELECT id, password_hash, is_public, host_id FROM rooms WHERE id = ?', [id]);
        
        if (!rooms || rooms.length === 0) {
            res.status(404).json({ success: false, message: 'Room not found' });
            return;
        }

        const room = rooms[0] as RowDataPacket;

        if (!room.is_public) {
             if (!password) {
                 res.status(400).json({ success: false, message: 'Password required' });
                 return;
             }
             const isMatch = await bcrypt.compare(password, room.password_hash);
             if (!isMatch) {
                 res.status(403).json({ success: false, message: 'Invalid password' });
                 return;
             }
         }
 
         // Check if user is already a participant
        const [existing] = await pool.query<RowDataPacket[]>('SELECT * FROM participants WHERE user_id = ? AND room_id = ?', [req.user.id, id]);
        
        if (existing.length === 0) {
            // Add to participants
            await pool.query('INSERT INTO participants (user_id, room_id) VALUES (?, ?)', [req.user.id, id]);
        }

        res.json({ success: true, message: 'Joined successfully' });

    } catch (error: any) {
        console.error('Join Room Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const leaveRoom = async (req: AuthRequest, res: Response) => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }

    const { id } = req.params;

    try {
        await pool.query('DELETE FROM participants WHERE user_id = ? AND room_id = ?', [req.user.id, id]);
        res.json({ success: true, message: 'Left room successfully' });
    } catch (error: any) {
        console.error('Leave Room Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const publishRoom = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }
  const { id } = req.params;
  try {
    const [rooms] = await pool.query<RowDataPacket[]>(
      'SELECT host_id, is_public FROM rooms WHERE id = ?', [id]
    );
    if (!rooms || rooms.length === 0) {
      res.status(404).json({ success: false, message: 'Room not found' });
      return;
    }
    const room = rooms[0] as RowDataPacket;

    if (req.user.id === (room as any).host_id) {
      res.status(403).json({ success: false, message: 'Host cannot participate in own room' });
      return;
    }
    if (room.host_id !== req.user.id) {
      res.status(403).json({ success: false, message: 'Not authorized' });
      return;
    }
    const [qRows] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) AS total FROM questions WHERE room_id = ?', [id]
    );
    const total = Number((qRows[0] as any).total) || 0;
    if (total === 0) {
      res.status(400).json({ success: false, message: 'Add questions before publishing' });
      return;
    }
    if (room.is_public) {
      await pool.query('UPDATE rooms SET status = ?, is_published = 1, published_at = NOW() WHERE id = ?', ['published', id]);
    } else {
      await pool.query('UPDATE rooms SET status = ? WHERE id = ?', ['waiting', id]);
    }
    res.json({ success: true, message: 'Room published' });
  } catch (error: any) {
    console.error('Publish Room Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
