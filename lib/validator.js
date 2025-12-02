/**
 * Validator để kiểm tra dữ liệu từ client
 */

class Validator {
    /**
     * Validate vị trí người chơi
     */
    validatePosition(x, y, mapWidth, mapHeight) {
        if (typeof x !== 'number' || typeof y !== 'number') {
            return { valid: false, reason: 'Invalid position type' };
        }

        if (isNaN(x) || isNaN(y)) {
            return { valid: false, reason: 'Position is NaN' };
        }

        if (x < 0 || x > mapWidth || y < 0 || y > mapHeight) {
            return { valid: false, reason: 'Position out of bounds' };
        }

        return { valid: true };
    }

    /**
     * Validate movement speed (chống teleport hack)
     */
    validateMovement(oldPos, newPos, maxSpeed = 10, deltaTime = 100) {
        const distance = Math.sqrt(
            Math.pow(newPos.x - oldPos.x, 2) + 
            Math.pow(newPos.y - oldPos.y, 2)
        );

        // Max distance = maxSpeed * (deltaTime / 16.67ms per frame at 60fps)
        const maxDistance = maxSpeed * (deltaTime / 16.67);

        if (distance > maxDistance * 2) { // x2 buffer cho lag
            return { 
                valid: false, 
                reason: `Movement too fast: ${distance.toFixed(2)} > ${maxDistance.toFixed(2)}` 
            };
        }

        return { valid: true };
    }

    /**
     * Validate damage (chống damage hack)
     */
    validateDamage(damage, skillId, attackerStats) {
        if (typeof damage !== 'number' || damage < 0) {
            return { valid: false, reason: 'Invalid damage value' };
        }

        // Giả sử max damage = attack * 3
        const maxDamage = (attackerStats?.attack || 10) * 3;

        if (damage > maxDamage) {
            return { 
                valid: false, 
                reason: `Damage too high: ${damage} > ${maxDamage}` 
            };
        }

        return { valid: true };
    }

    /**
     * Validate chat message
     */
    validateChatMessage(message) {
        if (typeof message !== 'string') {
            return { valid: false, reason: 'Message must be string' };
        }

        if (message.length === 0) {
            return { valid: false, reason: 'Message is empty' };
        }

        if (message.length > 500) {
            return { valid: false, reason: 'Message too long' };
        }

        // Chống spam ký tự đặc biệt
        const specialCharCount = (message.match(/[^a-zA-Z0-9\s\u00C0-\u1EF9]/g) || []).length;
        if (specialCharCount > message.length * 0.5) {
            return { valid: false, reason: 'Too many special characters' };
        }

        return { valid: true };
    }

    /**
     * Validate skill usage
     */
    validateSkillUsage(skillId, playerStats, cooldowns) {
        // Kiểm tra skill tồn tại
        const validSkills = ['basic-attack', 'slash', 'charge', 'fireball', 'ice-spike', 'heal', 'holy-strike', 'block'];
        if (!validSkills.includes(skillId)) {
            return { valid: false, reason: 'Invalid skill ID' };
        }

        // Kiểm tra cooldown (server-side tracking)
        const cooldown = cooldowns.get(skillId);
        if (cooldown && cooldown > Date.now()) {
            return { valid: false, reason: 'Skill on cooldown' };
        }

        return { valid: true };
    }

    /**
     * Sanitize string input
     */
    sanitizeString(str, maxLength = 100) {
        if (typeof str !== 'string') return '';
        
        // Remove control characters
        str = str.replace(/[\x00-\x1F\x7F]/g, '');
        
        // Trim and limit length
        return str.trim().substring(0, maxLength);
    }
}

module.exports = new Validator();
