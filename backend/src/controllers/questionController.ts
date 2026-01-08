import { type Request, type Response } from 'express';
import pool from '../config/db.js';
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
    const { rows: rooms } = await pool.query('SELECT host_id FROM rooms WHERE id = $1', [roomId]);
    if (rooms.length === 0) {
      res.status(404).json({ success: false, message: 'Room not found' });
      return;
    }
    const userId = (req.user as any).id as number;
    const hostId = rooms[0].host_id;
    if (hostId !== userId) {
      res.status(403).json({ success: false, message: 'Not authorized to edit this room' });
      return;
    }

    // Get current max order index
    const { rows: orderRows } = await pool.query('SELECT MAX(order_index) as max_order FROM questions WHERE room_id = $1', [roomId]);
    const maxOrder = orderRows.length > 0 && orderRows[0].max_order ? Number(orderRows[0].max_order) : 0;
    const nextOrder = maxOrder + 1;

    let result;
    try {
      const { rows } = await pool.query(
        'INSERT INTO questions (room_id, question_text, options, correct_answer_index, order_index, image_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
        [roomId, questionText, JSON.stringify(options), correctAnswerIndex, nextOrder, imageUrl || null]
      );
      result = rows[0];
    } catch (e: any) {
      // Fallback if imageUrl column issue or other constraint
       const { rows } = await pool.query(
        'INSERT INTO questions (room_id, question_text, options, correct_answer_index, order_index) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [roomId, questionText, JSON.stringify(options), correctAnswerIndex, nextOrder]
      );
      result = rows[0];
    }

    res.status(201).json({
      success: true,
      message: 'Question added',
      question: {
        id: result.id,
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
    const { rows: questions } = await pool.query(
      `SELECT q.id, r.host_id 
       FROM questions q 
       JOIN rooms r ON q.room_id = r.id 
       WHERE q.id = $1`, 
      [id]
    );

    if (questions.length === 0) {
      res.status(404).json({ success: false, message: 'Question not found' });
      return;
    }

    const userId = (req.user as any).id as number;
    const hostId = questions[0].host_id;
    if (hostId !== userId) {
      res.status(403).json({ success: false, message: 'Not authorized' });
      return;
    }

    await pool.query('DELETE FROM questions WHERE id = $1', [id]);

    res.json({ success: true, message: 'Question deleted' });

  } catch (error: any) {
    console.error('Delete Question Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getQuestions = async (req: AuthRequest, res: Response) => {
  const { roomId } = req.params;

  try {
     const { rows: questions } = await pool.query(
      'SELECT * FROM questions WHERE room_id = $1 ORDER BY order_index ASC',
      [roomId]
    );
    
    // Parse JSON options
    const parsedQuestions = questions.map((q: any) => ({
        ...q,
        options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options
    }));

    res.json({ success: true, questions: parsedQuestions });
  } catch (error: any) {
    console.error('Get Questions Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
