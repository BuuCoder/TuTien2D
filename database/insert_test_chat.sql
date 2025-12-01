-- Insert test chat messages for testing
-- Make sure map_id column exists first!

INSERT INTO chat_messages (user_id, username, channel_id, map_id, message, created_at) VALUES
(1, 'TestUser1', 1, 'map1', 'Xin chào mọi người!', NOW() - INTERVAL 10 MINUTE),
(2, 'TestUser2', 1, 'map1', 'Chào bạn!', NOW() - INTERVAL 9 MINUTE),
(1, 'TestUser1', 1, 'map1', 'Map này có quái gì không?', NOW() - INTERVAL 8 MINUTE),
(3, 'TestUser3', 1, 'map1', 'Có nhiều Slime ở đây', NOW() - INTERVAL 7 MINUTE),
(2, 'TestUser2', 1, 'map2', 'Map 2 nguy hiểm quá!', NOW() - INTERVAL 6 MINUTE),
(1, 'TestUser1', 1, 'map2', 'Cẩn thận với Goblin', NOW() - INTERVAL 5 MINUTE),
(3, 'TestUser3', 1, 'map1', 'Ai muốn PK không?', NOW() - INTERVAL 4 MINUTE),
(1, 'TestUser1', 1, 'map1', 'Mình đang farm gold', NOW() - INTERVAL 3 MINUTE),
(2, 'TestUser2', 1, 'map1', 'Level bao nhiêu rồi?', NOW() - INTERVAL 2 MINUTE),
(1, 'TestUser1', 1, 'map1', 'Level 5 rồi', NOW() - INTERVAL 1 MINUTE);

-- Check inserted data
SELECT id, username, channel_id, map_id, message, created_at 
FROM chat_messages 
WHERE map_id IN ('map1', 'map2') 
ORDER BY created_at DESC 
LIMIT 20;
