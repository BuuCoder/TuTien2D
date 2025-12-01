-- Add map_id column to chat_messages table
ALTER TABLE chat_messages 
ADD COLUMN map_id VARCHAR(50) DEFAULT 'map1' AFTER channel_id;

-- Add index for faster queries
CREATE INDEX idx_map_channel ON chat_messages(map_id, channel_id, created_at DESC);

-- Update existing records to have map_id
UPDATE chat_messages SET map_id = 'map1' WHERE map_id IS NULL;
