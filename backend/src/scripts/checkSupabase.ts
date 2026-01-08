import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkSupabase() {
  try {
    console.log('Connecting to Supabase...');
    const client = await pool.connect();
    console.log('Connected successfully.');

    const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    console.log('Tables:', res.rows.map(r => r.table_name));

    try {
        const users = await client.query('SELECT * FROM users LIMIT 5');
        console.log('Users:', users.rows);
    } catch (e: any) {
        console.log('Error querying users:', e.message);
    }

    client.release();
    process.exit(0);
  } catch (err) {
    console.error('Error checking Supabase:', err);
    process.exit(1);
  }
}

checkSupabase();
