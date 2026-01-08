import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import pool from '../config/db.js';
const router = express.Router();
router.post('/submit', authenticateToken, async (req, res) => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }
    const { roomId, questionId, selectedIndex } = req.body || {};
    if (roomId === undefined || questionId === undefined || selectedIndex === undefined) {
        res.status(400).json({ success: false, message: 'Missing fields' });
        return;
    }
    try {
        const qId = Number(questionId);
        const rId = Number(roomId);
        const sel = Number(selectedIndex);
        if (Number.isNaN(qId) || Number.isNaN(rId) || Number.isNaN(sel)) {
            res.status(400).json({ success: false, message: 'Invalid numeric fields' });
            return;
        }
        const [qs] = await pool.query('SELECT correct_answer_index FROM questions WHERE id = ? AND room_id = ?', [qId, rId]);
        if (!qs || qs.length === 0) {
            res.status(404).json({ success: false, message: 'Question not found' });
            return;
        }
        const correct = Number(qs[0].correct_answer_index);
        const isCorrect = sel === correct ? 1 : 0;
        const [roomRows] = await pool.query('SELECT time_per_question, start_time, is_public FROM rooms WHERE id = ?', [rId]);
        if (!roomRows || roomRows.length === 0) {
            res.status(404).json({ success: false, message: 'Room not found' });
            return;
        }
        const tpq = Number(roomRows[0].time_per_question) || 30;
        const isPublic = !!roomRows[0].is_public;
        let timeLeft = tpq;
        if (isPublic) {
            const elapsedMs = Number(req.body?.elapsedMs || 0);
            const elapsedSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
            timeLeft = Math.max(0, tpq - elapsedSeconds);
        }
        else {
            const rawStart = roomRows[0].start_time;
            let start = null;
            if (rawStart instanceof Date)
                start = rawStart;
            else if (rawStart)
                start = new Date(String(rawStart).replace(' ', 'T'));
            if (!start || isNaN(start.getTime())) {
                res.status(400).json({ success: false, message: 'Game not started' });
                return;
            }
            const now = new Date();
            const elapsedSeconds = Math.max(0, (now.getTime() - start.getTime()) / 1000);
            timeLeft = Math.max(0, Math.ceil(tpq - (elapsedSeconds % tpq)));
        }
        const maxPoints = 100;
        const score = isCorrect ? Math.max(0, Math.round((timeLeft / tpq) * maxPoints)) : 0;
        await pool.query(`INSERT INTO answers (room_id, question_id, user_id, selected_index, is_correct, score)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE selected_index = VALUES(selected_index), is_correct = VALUES(is_correct), score = VALUES(score)`, [rId, qId, req.user.id, sel, isCorrect, score]);
        // Update participant total_score and recompute position
        await pool.query(`UPDATE participants p
       SET total_score = (
         SELECT COALESCE(SUM(a.score), 0) FROM answers a WHERE a.room_id = ? AND a.user_id = ?
       )
       WHERE p.room_id = ? AND p.user_id = ?`, [rId, req.user.id, rId, req.user.id]);
        // Recompute positions for all participants in the room using window functions (MySQL 8+)
        await pool.query(`UPDATE participants p
       JOIN (
         SELECT u.id AS user_id,
                ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(a.score),0) DESC, COALESCE(SUM(a.is_correct),0) DESC) AS pos
         FROM users u
         JOIN participants p2 ON p2.user_id = u.id
         LEFT JOIN answers a ON a.user_id = u.id AND a.room_id = p2.room_id
         WHERE p2.room_id = ?
         GROUP BY u.id
       ) t ON t.user_id = p.user_id AND p.room_id = ?
       SET p.position = t.pos`, [rId, rId]);
        res.json({ success: true, isCorrect, score, timeLeft, timePerQuestion: tpq });
    }
    catch (e) {
        console.error('Submit answer error:', e);
        res.status(500).json({ success: false, message: 'Server error', error: e?.message });
    }
});
router.get('/leaderboard/:roomId', authenticateToken, async (req, res) => {
    const { roomId } = req.params;
    try {
        const [rows] = await pool.query(`SELECT u.id as user_id, u.username,
              COALESCE(SUM(a.score), 0) AS score,
              COUNT(*) AS answered,
              SUM(a.is_correct) AS correct
       FROM answers a
       JOIN users u ON a.user_id = u.id
       WHERE a.room_id = ?
       GROUP BY u.id, u.username
       ORDER BY score DESC, correct DESC, answered DESC, u.username ASC`, [roomId]);
        res.json({ success: true, leaderboard: rows });
    }
    catch (e) {
        console.error('Leaderboard error:', e);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});
router.get('/leaderboard-global', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.query(`SELECT u.id AS user_id, u.username,
              COALESCE(SUM(a.score),0) AS total_score,
              COALESCE(SUM(a.is_correct),0) AS correct,
              COUNT(*) AS answered,
              COUNT(DISTINCT a.room_id) AS rooms
       FROM answers a
       JOIN users u ON u.id = a.user_id
       GROUP BY u.id, u.username
       ORDER BY total_score DESC, correct DESC, answered DESC, u.username ASC`);
        const leaderboard = rows.map((r, idx) => ({
            user_id: r.user_id,
            username: r.username,
            score: Number(r.total_score) || 0,
            correct: Number(r.correct) || 0,
            answered: Number(r.answered) || 0,
            rooms: Number(r.rooms) || 0,
            position: idx + 1,
        }));
        res.json({ success: true, leaderboard });
    }
    catch (e) {
        console.error('Global leaderboard error:', e);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});
router.get('/my/:roomId', authenticateToken, async (req, res) => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }
    const { roomId } = req.params;
    try {
        const [rows] = await pool.query(`SELECT question_id, selected_index, is_correct, score FROM answers WHERE room_id = ? AND user_id = ?`, [roomId, req.user.id]);
        res.json({ success: true, answers: rows });
    }
    catch (e) {
        console.error('Get my answers error:', e);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});
router.post('/my-status', authenticateToken, async (req, res) => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }
    try {
        const roomIds = Array.isArray(req.body?.roomIds) ? req.body.roomIds.map((n) => Number(n)).filter((n) => Number.isFinite(n)) : [];
        if (roomIds.length === 0) {
            res.json({ success: true, status: [] });
            return;
        }
        const [qCounts] = await pool.query(`SELECT room_id, COUNT(*) AS total FROM questions WHERE room_id IN (?) GROUP BY room_id`, [roomIds]);
        const [aCounts] = await pool.query(`SELECT room_id, COUNT(*) AS answered FROM answers WHERE user_id = ? AND room_id IN (?) GROUP BY room_id`, [req.user.id, roomIds]);
        const qMap = new Map();
        for (const r of qCounts)
            qMap.set(Number(r.room_id), Number(r.total));
        const aMap = new Map();
        for (const r of aCounts)
            aMap.set(Number(r.room_id), Number(r.answered));
        const status = roomIds.map((rid) => {
            const total = qMap.get(rid) || 0;
            const answered = aMap.get(rid) || 0;
            return { roomId: rid, participated: answered > 0, completed: answered >= total && total > 0 };
        });
        res.json({ success: true, status });
    }
    catch (e) {
        console.error('my-status error:', e);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});
export default router;
//# sourceMappingURL=answerRoutes.js.map