import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
async function initDb() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        multipleStatements: true
    });
    try {
        console.log('Connected to MySQL server.');
        const dbName = process.env.DB_NAME || 'ritualquiz_db';
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
        console.log(`Database '${dbName}' created or already exists.`);
        await connection.changeUser({ database: dbName });
        // Path to schema.sql: ../database/schema.sql
        const schemaPath = path.resolve(__dirname, '../database/schema.sql');
        console.log(`Reading schema from: ${schemaPath}`);
        const schema = await fs.readFile(schemaPath, 'utf8');
        console.log('Executing schema...');
        await connection.query(schema);
        console.log('Database initialized successfully!');
    }
    catch (error) {
        console.error('Error initializing database:', error);
    }
    finally {
        await connection.end();
    }
}
initDb();
//# sourceMappingURL=initDb.js.map