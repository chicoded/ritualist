import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();
async function checkUsers() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'ritualquiz_db'
    });
    try {
        const [users] = await connection.query('SELECT id, username, email, avatar_url FROM users ORDER BY id DESC LIMIT 5');
        console.log('Recent Users:', users);
    }
    catch (error) {
        console.error('Error:', error);
    }
    finally {
        await connection.end();
    }
}
checkUsers();
//# sourceMappingURL=checkUsers.js.map