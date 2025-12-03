-- Bảng lưu các request đã xử lý để tránh duplicate
CREATE TABLE IF NOT EXISTS processed_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    request_id VARCHAR(255) UNIQUE NOT NULL,
    user_id INT NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    INDEX idx_request_id (request_id),
    INDEX idx_user_id (user_id),
    INDEX idx_expires_at (expires_at)
);

-- Auto cleanup expired requests (older than 1 hour)
-- Run this periodically or use MySQL Event Scheduler
-- DELETE FROM processed_requests WHERE expires_at < NOW();
