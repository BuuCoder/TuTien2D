-- Add base stats columns to user_stats table
-- Base stats = stats from level/items (không bao gồm skin bonus)
-- Final stats = base stats + skin bonus

ALTER TABLE user_stats 
ADD COLUMN base_max_hp INT DEFAULT 500 COMMENT 'Base max HP from level/items',
ADD COLUMN base_max_mp INT DEFAULT 200 COMMENT 'Base max MP from level/items',
ADD COLUMN base_attack INT DEFAULT 10 COMMENT 'Base attack from level/items',
ADD COLUMN base_defense INT DEFAULT 5 COMMENT 'Base defense from level/items',
ADD COLUMN base_speed DECIMAL(5,2) DEFAULT 5.00 COMMENT 'Base speed from level/items';

-- Update existing data: set base stats = default values
UPDATE user_stats SET 
    base_max_hp = 500,
    base_max_mp = 200,
    base_attack = 10, 
    base_defense = 5,
    base_speed = 5.00;

-- Note: 
-- - base_*: Chỉ số gốc từ level, items
-- - max_hp/max_mp/attack/defense/speed: Chỉ số cuối cùng (base * (1 + skin bonus%))
-- - TẤT CẢ skin bonus đều là % (percentage)
-- - Formula: Final = Base * (1 + Bonus%)
-- - Example: base_attack = 10, attackBonus = 300% → attack = 10 * 4 = 40
