-- Tạo database
CREATE DATABASE IF NOT EXISTS tutien2d;
USE tutien2d;

-- Bảng users - lưu thông tin đăng nhập
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    active_session_id VARCHAR(255) NULL,
    INDEX idx_username (username),
    INDEX idx_session (active_session_id)
);

-- Bảng user_inventory - lưu trữ item và tiền vàng
CREATE TABLE IF NOT EXISTS user_inventory (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    gold INT DEFAULT 0,
    items JSON DEFAULT '[]',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id)
);

-- Bảng user_stats - thống kê người chơi
CREATE TABLE IF NOT EXISTS user_stats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    level INT DEFAULT 1,
    experience INT DEFAULT 0,
    hp INT DEFAULT 100,
    max_hp INT DEFAULT 100,
    mp INT DEFAULT 50,
    max_mp INT DEFAULT 50,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id)
);

-- Insert dữ liệu mẫu (optional)
-- Password: 123456 (nên hash trong production)
INSERT INTO users (username, password, email) VALUES 
('player1', '123456', 'player1@example.com'),
('player2', '123456', 'player2@example.com')
ON DUPLICATE KEY UPDATE username=username;

-- Tạo inventory cho users mẫu
INSERT INTO user_inventory (user_id, gold, items) 
SELECT id, 1000, '[]' FROM users WHERE username IN ('player1', 'player2')
ON DUPLICATE KEY UPDATE gold=gold;

-- Tạo stats cho users mẫu
INSERT INTO user_stats (user_id, level, experience, hp, max_hp, mp, max_mp)
SELECT id, 1, 0, 100, 100, 50, 50 FROM users WHERE username IN ('player1', 'player2')
ON DUPLICATE KEY UPDATE level=level;
