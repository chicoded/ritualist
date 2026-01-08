import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const schema = `
-- Enums (using DO block to avoid error if exists)
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('participant', 'host');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE room_status AS ENUM ('waiting', 'active', 'completed', 'published');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Users
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role user_role DEFAULT 'participant',
  avatar_url TEXT,
  discord_id TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rooms
CREATE TABLE IF NOT EXISTS rooms (
  id SERIAL PRIMARY KEY,
  room_code VARCHAR(10) UNIQUE NOT NULL,
  host_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  max_participants INT DEFAULT 50,
  time_per_question INT DEFAULT 30,
  status room_status DEFAULT 'waiting',
  is_public BOOLEAN DEFAULT TRUE,
  is_published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMP,
  password_hash VARCHAR(255),
  start_time TIMESTAMP,
  cover_photo_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Participants
CREATE TABLE IF NOT EXISTS participants (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  room_id INT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  score INT DEFAULT 0,
  total_score INT DEFAULT 0,
  position INT,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, room_id)
);

-- Questions
CREATE TABLE IF NOT EXISTS questions (
  id SERIAL PRIMARY KEY,
  room_id INT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_answer_index INT NOT NULL,
  order_index INT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Answers
CREATE TABLE IF NOT EXISTS answers (
  id SERIAL PRIMARY KEY,
  room_id INT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  question_id INT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  selected_index INT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  score INT NOT NULL,
  answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(room_id, question_id, user_id)
);
`;

async function initSupabase() {
  try {
    console.log('Connecting to Supabase...');
    const client = await pool.connect();
    console.log('Connected successfully.');

    console.log('Executing schema...');
    await client.query(schema);
    console.log('Schema executed successfully!');

    client.release();
    process.exit(0);
  } catch (err) {
    console.error('Error initializing Supabase:', err);
    process.exit(1);
  }
}

initSupabase();
