-- Thêm indexes để tăng tốc queries
-- Chạy file này để optimize database performance

-- Index cho chat_messages (query thường xuyên)
CREATE INDEX IF NOT EXISTS idx_chat_map_channel_time 
ON chat_messages(map_id, channel_id, created_at DESC);

-- Index cho friends (query khi gửi friend request)
CREATE INDEX IF NOT EXISTS idx_friends_user1 
ON friends(user_id_1, status);

CREATE INDEX IF NOT EXISTS idx_friends_user2 
ON friends(user_id_2, status);

-- Index cho user_stats (query mỗi lần attack)
CREATE INDEX IF NOT EXISTS idx_user_stats_user_id 
ON user_stats(user_id);

-- Index cho users (query khi validate session)
CREATE INDEX IF NOT EXISTS idx_users_id 
ON users(id);

-- Index cho user_inventory (query khi pickup gold)
CREATE INDEX IF NOT EXISTS idx_inventory_user_id 
ON user_inventory(user_id);

-- Kiểm tra indexes đã tạo
SHOW INDEX FROM chat_messages;
SHOW INDEX FROM friends;
SHOW INDEX FROM user_stats;
SHOW INDEX FROM users;
SHOW INDEX FROM user_inventory;
