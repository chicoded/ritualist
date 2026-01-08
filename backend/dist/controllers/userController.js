import pool from '../config/db.js';
export const updateMyAvatar = async (req, res) => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }
    const { avatarUrl } = req.body;
    if (!avatarUrl || typeof avatarUrl !== 'string') {
        res.status(400).json({ success: false, message: 'avatarUrl is required' });
        return;
    }
    try {
        await pool.query('UPDATE users SET avatar_url = ? WHERE id = ?', [avatarUrl, req.user.id]);
        res.json({ success: true });
    }
    catch (e) {
        console.error('updateMyAvatar error:', e);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
export const getMyRecentPlayed = async (req, res) => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }
    try {
        const [rows] = await pool.query(`SELECT r.id, r.title, r.room_code,
              MAX(a.created_at) AS last_played,
              COUNT(a.id) AS answered,
              COALESCE(SUM(a.score),0) AS total_score
       FROM answers a
       JOIN rooms r ON r.id = a.room_id
       WHERE a.user_id = ?
       GROUP BY r.id, r.title, r.room_code
       ORDER BY last_played DESC
       LIMIT 10`, [req.user.id]);
        const items = rows.map(r => ({
            id: Number(r.id),
            title: r.title,
            room_code: r.room_code,
            last_played: r.last_played,
            answered: Number(r.answered) || 0,
            total_score: Number(r.total_score) || 0,
        }));
        res.json({ success: true, recent: items });
    }
    catch (e) {
        console.error('getMyRecentPlayed error:', e);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
export const getMyScore = async (req, res) => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }
    try {
        const [rows] = await pool.query('SELECT COALESCE(SUM(score),0) AS total_score, COALESCE(SUM(is_correct),0) AS correct, COUNT(*) AS answered FROM answers WHERE user_id = ?', [req.user.id]);
        const r = rows && rows[0] ? rows[0] : { total_score: 0, correct: 0, answered: 0 };
        res.json({ success: true, total_score: Number(r.total_score) || 0, correct: Number(r.correct) || 0, answered: Number(r.answered) || 0 });
    }
    catch (e) {
        console.error('getMyScore error:', e);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
//# sourceMappingURL=userController.js.map