-- Check if map_id column exists
DESCRIBE chat_messages;

-- Check sample data
SELECT id, username, channel_id, map_id, message, created_at 
FROM chat_messages 
ORDER BY created_at DESC 
LIMIT 10;
