-- Migration: Thêm chức năng skin system

-- 1. Thêm cột skin vào bảng users nếu chưa có
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS skin VARCHAR(50) DEFAULT 'knight' AFTER active_session_id;

-- 2. Tạo bảng user_skin
CREATE TABLE IF NOT EXISTS user_skin (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    skin_id VARCHAR(50) NOT NULL,
    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_skin (user_id, skin_id)
);

-- 3. Insert default knight skin cho tất cả users hiện có
INSERT IGNORE INTO user_skin (user_id, skin_id)
SELECT id, 'knight' FROM users;

-- 4. Update skin mặc định cho users chưa có
UPDATE users SET skin = 'knight' WHERE skin IS NULL OR skin = '';
