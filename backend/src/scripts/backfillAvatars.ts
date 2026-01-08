import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function backfill() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ritualquiz_db'
  });

  try {
    const [users]: any = await connection.query('SELECT id, username, avatar_url FROM users WHERE avatar_url IS NULL OR avatar_url = ""');
    console.log(`Found ${users.length} users needing avatars.`);

    const dir = path.resolve(__dirname, '../../uploads', 'siggy');
    if (!fs.existsSync(dir)) {
        console.error('Siggy directory not found at:', dir);
        return;
    }
    const files = fs.readdirSync(dir).filter(f => /\.(png|jpe?g|webp|gif)$/i.test(f));
    if (files.length === 0) {
        console.error('No images in siggy directory.');
        return;
    }

    for (const user of users) {
        const chosen = files[Math.floor(Math.random() * files.length)];
        const url = `/uploads/siggy/${chosen}`;
        console.log(`Assigning ${url} to user ${user.username} (${user.id})`);
        await connection.query('UPDATE users SET avatar_url = ? WHERE id = ?', [url, user.id]);
    }
    console.log('Backfill complete.');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

backfill();
