-- Add combat stats columns to user_stats table
-- Run this SQL in your database

ALTER TABLE user_stats 
ADD COLUMN IF NOT EXISTS attack INT DEFAULT 10,
ADD COLUMN IF NOT EXISTS defense INT DEFAULT 5,
ADD COLUMN IF NOT EXISTS speed DECIMAL(5,2) DEFAULT 5.00;

-- Update existing users with default values
UPDATE user_stats 
SET attack = 10, defense = 5, speed = 5.00 
WHERE attack IS NULL OR defense IS NULL OR speed IS NULL;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_stats_combat ON user_stats(attack, defense, speed);

-- Verify
SELECT id, user_id, attack, defense, speed FROM user_stats LIMIT 5;
