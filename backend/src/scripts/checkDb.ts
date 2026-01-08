import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function checkDb() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ritualquiz_db'
  });

  try {
    console.log('Connected to MySQL server.');
    
    const [rows] = await connection.query('SHOW TABLES');
    console.log('Tables:', rows);

    // Check if users table has data
    try {
        const [users] = await connection.query('SELECT * FROM users LIMIT 5');
        console.log('Users:', users);
    } catch (e: any) {
        console.log('Error querying users:', e.message);
    }

  } catch (error) {
    console.error('Error checking database:', error);
  } finally {
    await connection.end();
  }
}

checkDb();
