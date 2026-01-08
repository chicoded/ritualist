-- User Table (users)
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('participant', 'host') DEFAULT 'participant',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_username (username)
);

-- Room Table (rooms)
CREATE TABLE IF NOT EXISTS rooms (
  id INT PRIMARY KEY AUTO_INCREMENT,
  room_code VARCHAR(10) UNIQUE NOT NULL,
  host_id INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  max_participants INT DEFAULT 50,
  time_per_question INT DEFAULT 30,
  status ENUM('waiting', 'active', 'completed') DEFAULT 'waiting',
  is_public BOOLEAN DEFAULT TRUE,
  password_hash VARCHAR(255) NULL,
  start_time DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (host_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_room_code (room_code),
  INDEX idx_host_id (host_id)
);

-- Participants Table (participants)
CREATE TABLE IF NOT EXISTS participants (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  room_id INT NOT NULL,
  score INT DEFAULT 0,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  UNIQUE KEY unique_participant (user_id, room_id),
  INDEX idx_room_participants (room_id)
);

-- Questions Table (questions)
CREATE TABLE IF NOT EXISTS questions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  room_id INT NOT NULL,
  question_text TEXT NOT NULL,
  options JSON NOT NULL,
  correct_answer_index INT NOT NULL,
  order_index INT NOT NULL,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  INDEX idx_room_questions (room_id)
);

-- Answers Table (answers)
CREATE TABLE IF NOT EXISTS answers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  participant_id INT NOT NULL,
  question_id INT NOT NULL,
  selected_option INT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  time_taken INT NOT NULL,
  answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
  INDEX idx_participant_answers (participant_id),
  INDEX idx_question_answers (question_id)
);
