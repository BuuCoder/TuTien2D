/**
 * Rate Limiter để chống spam và abuse
 */

class RateLimiter {
    constructor() {
        // Map: userId -> { count, resetTime, blocked }
        this.limits = new Map();
        
        // Cấu hình limits cho từng loại event
        this.config = {
            'player_move': { maxPerSecond: 15, blockDuration: 3000 }, // Giảm từ 30 -> 15 (client đã throttle tốt hơn)
            'use_skill': { maxPerSecond: 10, blockDuration: 10000 },
            'send_chat': { maxPerSecond: 3, blockDuration: 30000 },
            'send_pk_request': { maxPerSecond: 2, blockDuration: 60000 },
            'send_friend_request': { maxPerSecond: 2, blockDuration: 60000 },
            'attack_monster': { maxPerSecond: 20, blockDuration: 5000 },
        };
    }

    /**
     * Kiểm tra xem user có bị rate limit không
     * @param {string} userId 
     * @param {string} eventType 
     * @returns {Object} { allowed: boolean, reason?: string }
     */
    check(userId, eventType) {
        const config = this.config[eventType];
        if (!config) {
            // Không có config = cho phép
            return { allowed: true };
        }

        const key = `${userId}:${eventType}`;
        const now = Date.now();
        
        let limit = this.limits.get(key);
        
        // Nếu đang bị block
        if (limit && limit.blocked && now < limit.blockUntil) {
            const remainingSeconds = Math.ceil((limit.blockUntil - now) / 1000);
            return { 
                allowed: false, 
                reason: `Bạn đang bị chặn. Vui lòng đợi ${remainingSeconds}s` 
            };
        }

        // Reset nếu đã qua 1 giây
        if (!limit || now - limit.resetTime > 1000) {
            limit = {
                count: 0,
                resetTime: now,
                blocked: false,
                blockUntil: 0
            };
            this.limits.set(key, limit);
        }

        // Tăng counter
        limit.count++;

        // Kiểm tra vượt giới hạn
        if (limit.count > config.maxPerSecond) {
            limit.blocked = true;
            limit.blockUntil = now + config.blockDuration;
            
            console.log(`[RateLimit] User ${userId} blocked for ${eventType} (${config.blockDuration}ms)`);
            
            return { 
                allowed: false, 
                reason: `Quá nhiều request! Bị chặn ${config.blockDuration / 1000}s` 
            };
        }

        return { allowed: true };
    }

    /**
     * Xóa limit của user (khi disconnect)
     */
    clear(userId) {
        const keysToDelete = [];
        for (const key of this.limits.keys()) {
            if (key.startsWith(`${userId}:`)) {
                keysToDelete.push(key);
            }
        }
        keysToDelete.forEach(key => this.limits.delete(key));
    }

    /**
     * Cleanup expired blocks (chạy định kỳ)
     */
    cleanup() {
        const now = Date.now();
        for (const [key, limit] of this.limits.entries()) {
            if (limit.blocked && now > limit.blockUntil) {
                this.limits.delete(key);
            }
        }
    }
}

module.exports = new RateLimiter();
