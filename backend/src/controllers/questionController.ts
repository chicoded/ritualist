import { type Request, type Response } from 'express';
import pool from '../config/db.js';
import { type RowDataPacket, type ResultSetHeader } from 'mysql2';
import { type AuthRequest } from '../middleware/authMiddleware.js';

export const addQuestion = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  const { roomId } = req.params;
  const { questionText, options, correctAnswerIndex, imageUrl } = req.body;

  if (!questionText || !options || correctAnswerIndex === undefined) {
    res.status(400).json({ success: false, message: 'Missing required fields' });
    return;
  }

  try {
    // Verify ownership
    const [rooms] = await pool.query<RowDataPacket[]>('SELECT host_id FROM rooms WHERE id = ?', [roomId]);
    if (rooms.length === 0) {
      res.status(404).json({ success: false, message: 'Room not found' });
      return;
    }
    const userId = (req.user as any).id as number;
    const roomRow = rooms[0] as RowDataPacket;
    const hostId = (roomRow as any).host_id as number;
    if (hostId !== userId) {
      res.status(403).json({ success: false, message: 'Not authorized to edit this room' });
      return;
    }

    // Get current max order index
    const [rows] = await pool.query<RowDataPacket[]>('SELECT MAX(order_index) as maxOrder FROM questions WHERE room_id = ?', [roomId]);
    const maxOrder = rows && rows.length > 0 && (rows[0] as any).maxOrder ? Number((rows[0] as any).maxOrder) : 0;
    const nextOrder = maxOrder + 1;

    let result: ResultSetHeader;
    try {
      const [r] = await pool.query<ResultSetHeader>(
        'INSERT INTO questions (room_id, question_text, options, correct_answer_index, order_index, image_url) VALUES (?, ?, ?, ?, ?, ?)',
        [roomId, questionText, JSON.stringify(options), correctAnswerIndex, nextOrder, imageUrl || null]
      );
      result = r;
    } catch (e: any) {
      const [r2] = await pool.query<ResultSetHeader>(
        'INSERT INTO questions (room_id, question_text, options, correct_answer_index, order_index) VALUES (?, ?, ?, ?, ?)',
        [roomId, questionText, JSON.stringify(options), correctAnswerIndex, nextOrder]
      );
      result = r2;
    }

    res.status(201).json({
      success: true,
      message: 'Question added',
      question: {
        id: result.insertId,
        questionText,
        options,
        correctAnswerIndex,
        orderIndex: nextOrder,
        imageUrl: imageUrl || null
      }
    });

  } catch (error: any) {
    console.error('Add Question Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const deleteQuestion = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  const { id } = req.params;

  try {
    // Verify ownership via join
    const [questions] = await pool.query<RowDataPacket[]>(
      `SELECT q.id, r.host_id 
       FROM questions q 
       JOIN rooms r ON q.room_id = r.id 
       WHERE q.id = ?`, 
      [id]
    );

    if (questions.length === 0) {
      res.status(404).json({ success: false, message: 'Question not found' });
      return;
    }

    const userId = (req.user as any).id as number;
    const qRow = questions[0] as RowDataPacket;
    const hostId = (qRow as any).host_id as number;
    if (hostId !== userId) {
      res.status(403).json({ success: false, message: 'Not authorized' });
      return;
    }

    await pool.query('DELETE FROM questions WHERE id = ?', [id]);

    res.json({ success: true, message: 'Question deleted' });

  } catch (error: any) {
    console.error('Delete Question Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getQuestions = async (req: AuthRequest, res: Response) => {
  const { roomId } = req.params;

  try {
     const [questions] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM questions WHERE room_id = ? ORDER BY order_index ASC',
      [roomId]
    );
    
    // Parse JSON options
    const parsedQuestions = questions.map(q => ({
        ...q,
        options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options
    }));

    res.json({ success: true, questions: parsedQuestions });
  } catch (error: any) {
    console.error('Get Questions Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
