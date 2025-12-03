/**
 * Server-side validation utilities
 * KHÔNG BAO GIỜ tin tưởng data từ client
 */

/**
 * Validate monster pickup
 */
function validateMonsterPickup(monster, userId, channelId) {
    // Check monster exists
    if (!monster) {
        return { valid: false, reason: 'Monster không tồn tại' };
    }

    // Check monster is dead
    if (!monster.isDead) {
        return { valid: false, reason: 'Monster chưa chết' };
    }

    // Check monster has gold
    if (!monster.goldDrop || monster.goldDrop <= 0) {
        return { valid: false, reason: 'Monster không có vàng' };
    }

    // Check gold amount is reasonable (anti-cheat)
    if (monster.goldDrop > 10000) {
        console.error(`[Validation] Suspicious gold amount: ${monster.goldDrop} from monster ${monster.monsterId}`);
        return { valid: false, reason: 'Số vàng không hợp lệ' };
    }

    return { valid: true, goldAmount: monster.goldDrop };
}

/**
 * Validate skill usage
 */
function validateSkillUsage(skillId, playerStats, skillData) {
    // Check skill exists
    if (!skillData) {
        return { valid: false, reason: 'Skill không tồn tại' };
    }

    // Check MP enough
    if (playerStats.mp < skillData.manaCost) {
        return { valid: false, reason: 'Không đủ MP' };
    }

    // Check skill damage is reasonable (anti-cheat)
    if (skillData.damage > 1000) {
        console.error(`[Validation] Suspicious skill damage: ${skillData.damage} for skill ${skillId}`);
        return { valid: false, reason: 'Skill không hợp lệ' };
    }

    return { valid: true, mpCost: skillData.manaCost, damage: skillData.damage };
}

/**
 * Validate position (anti-teleport)
 */
function validatePosition(oldPos, newPos, maxSpeed, deltaTime) {
    const distance = Math.sqrt(
        Math.pow(newPos.x - oldPos.x, 2) + 
        Math.pow(newPos.y - oldPos.y, 2)
    );

    const maxDistance = maxSpeed * (deltaTime / 1000);

    if (distance > maxDistance * 1.5) { // 1.5x tolerance for lag
        return { 
            valid: false, 
            reason: 'Di chuyển quá nhanh (có thể teleport hack)',
            distance,
            maxDistance
        };
    }

    return { valid: true };
}

/**
 * Validate gold amount (anti-cheat)
 */
function validateGoldAmount(amount) {
    // Check type
    if (typeof amount !== 'number') {
        return { valid: false, reason: 'Gold amount phải là số' };
    }

    // Check range
    if (amount < 0 || amount > 10000) {
        return { valid: false, reason: 'Gold amount không hợp lệ (0-10000)' };
    }

    // Check is integer
    if (!Number.isInteger(amount)) {
        return { valid: false, reason: 'Gold amount phải là số nguyên' };
    }

    return { valid: true };
}

/**
 * Validate damage amount (anti-cheat)
 */
function validateDamage(damage, skillId, attackerLevel) {
    // Check type
    if (typeof damage !== 'number') {
        return { valid: false, reason: 'Damage phải là số' };
    }

    // Check range based on level
    const maxDamage = 100 + (attackerLevel * 50); // Example formula

    if (damage < 0 || damage > maxDamage) {
        console.error(`[Validation] Suspicious damage: ${damage} from level ${attackerLevel} (max: ${maxDamage})`);
        return { valid: false, reason: 'Damage không hợp lệ' };
    }

    return { valid: true };
}

/**
 * Sanitize string input (anti-XSS)
 */
function sanitizeString(str, maxLength = 500) {
    if (typeof str !== 'string') {
        return '';
    }

    // Remove HTML tags
    str = str.replace(/<[^>]*>/g, '');
    
    // Remove special characters
    str = str.replace(/[<>\"']/g, '');
    
    // Trim
    str = str.trim();
    
    // Limit length
    if (str.length > maxLength) {
        str = str.substring(0, maxLength);
    }

    return str;
}

module.exports = {
    validateMonsterPickup,
    validateSkillUsage,
    validatePosition,
    validateGoldAmount,
    validateDamage,
    sanitizeString
};
