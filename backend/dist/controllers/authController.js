import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
function pickRandomSiggyAvatar() {
    try {
        const dir = path.resolve(__dirname, '../uploads', 'siggy');
        if (!fs.existsSync(dir))
            return null;
        const files = fs.readdirSync(dir).filter(f => /\.(png|jpe?g|webp|gif)$/i.test(f));
        if (files.length === 0)
            return null;
        const chosen = files[Math.floor(Math.random() * files.length)];
        return `/uploads/siggy/${chosen}`;
    }
    catch {
        return null;
    }
}
export const register = async (req, res) => {
    const { username, email, password, role } = req.body;
    if (req.method === "GET") {
        res.status(400).json({ success: false, message: 'Please use POST method for registration' });
        return;
    }
    if (!username || !email || !password) {
        res.status(400).json({ success: false, message: 'Please provide all required fields' });
        return;
    }
    try {
        // Check if user exists
        const [existingUsers] = await pool.query('SELECT * FROM users WHERE email = ? OR username = ?', [email, username]);
        if (existingUsers.length > 0) {
            res.status(409).json({ success: false, message: 'User already exists' });
            return;
        }
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        const defaultAvatar = pickRandomSiggyAvatar();
        // Insert user
        const [result] = await pool.query('INSERT INTO users (username, email, password_hash, role, avatar_url) VALUES (?, ?, ?, ?, ?)', [username, email, passwordHash, role || 'participant', defaultAvatar]);
        const token = jwt.sign({ id: result.insertId, username, role: role || 'participant' }, JWT_SECRET, { expiresIn: '24h' });
        res.status(201).json({
            success: true,
            token,
            user: { id: result.insertId, username, email, role: role || 'participant', avatar_url: defaultAvatar || '' }
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};
export const login = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        res.status(400).json({ success: false, message: 'Please provide email and password' });
        return;
    }
    try {
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
            return;
        }
        const user = users[0];
        if (!user) {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
            return;
        }
        const isMatch = await bcrypt.compare(password, user['password_hash']);
        if (!isMatch) {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
            return;
        }
        // Assign random avatar from siggy if missing or invalid
        let currentAvatar = user['avatar_url'] ? String(user['avatar_url']) : '';
        const needsAvatar = !currentAvatar || /^(?!https?:\/\/)(?!\/uploads\/)/i.test(currentAvatar);
        if (needsAvatar) {
            const chosen = pickRandomSiggyAvatar();
            if (chosen) {
                await pool.query('UPDATE users SET avatar_url = ? WHERE id = ?', [chosen, user['id']]);
                currentAvatar = chosen;
                user['avatar_url'] = chosen;
            }
        }
        else if (currentAvatar && currentAvatar.startsWith('/uploads/')) {
            // If it's an uploads path, ensure file exists; otherwise pick a random
            try {
                const rel = currentAvatar.replace(/^\/uploads\//, '');
                const fsPath = path.resolve(__dirname, '../uploads', rel);
                if (!fs.existsSync(fsPath)) {
                    const chosen = pickRandomSiggyAvatar();
                    if (chosen) {
                        await pool.query('UPDATE users SET avatar_url = ? WHERE id = ?', [chosen, user['id']]);
                        currentAvatar = chosen;
                        user['avatar_url'] = chosen;
                    }
                }
            }
            catch { }
        }
        const token = jwt.sign({ id: user['id'], username: user['username'], role: user['role'] }, JWT_SECRET, { expiresIn: '24h' });
        const publicAvatarLogin = String(currentAvatar || '');
        res.json({
            success: true,
            token,
            user: { id: user['id'], username: user['username'], email: user['email'], role: user['role'], avatar_url: publicAvatarLogin }
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};
export const discordRedirect = async (req, res) => {
    try {
        const clientId = process.env.DISCORD_CLIENT_ID;
        const redirectUri = process.env.DISCORD_REDIRECT_URI;
        if (!clientId || !redirectUri) {
            res.status(500).json({ success: false, message: 'Discord OAuth not configured: set DISCORD_CLIENT_ID and DISCORD_REDIRECT_URI in .env' });
            return;
        }
        const scope = encodeURIComponent('identify email');
        const state = Math.random().toString(36).slice(2);
        const url = `https://discord.com/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${state}`;
        console.log('Discord OAuth authorize URL:', url);
        res.redirect(url);
    }
    catch (e) {
        res.status(500).json({ success: false, message: 'Discord redirect error' });
    }
};
export const discordCallback = async (req, res) => {
    try {
        const code = req.query.code;
        if (!code) {
            res.status(400).send('Missing code');
            return;
        }
        const clientId = process.env.DISCORD_CLIENT_ID;
        const clientSecret = process.env.DISCORD_CLIENT_SECRET;
        const redirectUri = process.env.DISCORD_REDIRECT_URI;
        if (!clientId || !clientSecret || !redirectUri) {
            res.status(500).send('Discord OAuth not configured');
            return;
        }
        const body = new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
        });
        const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body,
        });
        const tokenJson = (await tokenRes.json());
        if (!tokenRes.ok) {
            res.status(400).send('Discord token exchange failed');
            return;
        }
        const accessToken = tokenJson.access_token || '';
        const userRes = await fetch('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        const dUser = (await userRes.json());
        if (!userRes.ok) {
            res.status(400).send('Discord user fetch failed');
            return;
        }
        const discordId = String(dUser.id ?? '');
        const username = String(dUser.username ?? '');
        const email = dUser.email ? String(dUser.email) : '';
        const avatarUrl = dUser.avatar ? `https://cdn.discordapp.com/avatars/${discordId}/${dUser.avatar}.png` : null;
        // Upsert user
        const [existingByDiscord] = await pool.query('SELECT * FROM users WHERE discord_id = ?', [discordId]);
        let userId;
        if (existingByDiscord.length > 0) {
            const usr = existingByDiscord[0];
            userId = Number(usr.id);
            await pool.query('UPDATE users SET username = ?, email = COALESCE(?, email), avatar_url = ? WHERE id = ?', [username, email || usr.email, avatarUrl, userId]);
        }
        else {
            // If email exists, link account
            let existingEmailId = null;
            if (email) {
                const [existingByEmail] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
                if (existingByEmail.length > 0)
                    existingEmailId = Number(existingByEmail[0].id);
            }
            if (existingEmailId) {
                userId = existingEmailId;
                await pool.query('UPDATE users SET discord_id = ?, avatar_url = ?, username = ? WHERE id = ?', [discordId, avatarUrl, username, userId]);
            }
            else {
                const [ins] = await pool.query('INSERT INTO users (username, email, password_hash, role, discord_id, avatar_url) VALUES (?, ?, ?, ?, ?, ?)', [username, email, '', 'participant', discordId, avatarUrl]);
                userId = ins.insertId;
            }
        }
        const token = jwt.sign({ id: userId, username, role: 'participant' }, JWT_SECRET, { expiresIn: '24h' });
        // Return a small HTML to postMessage back to opener
        const payload = {
            success: true,
            token,
            user: { id: userId, username, email, role: 'participant' },
        };
        res.setHeader('Content-Type', 'text/html');
        res.send(`<!doctype html><html><body><script>try{window.opener&&window.opener.postMessage(${JSON.stringify(payload)},'*');}catch(e){};window.close();</script><p>Login completed. You can close this window.</p></body></html>`);
    }
    catch (e) {
        console.error('Discord callback error:', e);
        res.status(500).send('Server error');
    }
};
//# sourceMappingURL=authController.js.map