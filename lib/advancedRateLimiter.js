/**
 * Advanced Rate Limiter với multiple strategies
 */

class AdvancedRateLimiter {
    constructor() {
        // Store: userId -> action -> timestamps[]
        this.requests = new Map();
        
        // Store: userId -> suspicious activity count
        this.suspiciousActivity = new Map();
        
        // Limits per action type
        this.limits = {
            'pickup_gold': { max: 10, window: 60000 }, // 10 pickups per minute
            'use_skill': { max: 30, window: 60000 },   // 30 skills per minute
            'player_move': { max: 100, window: 10000 }, // 100 moves per 10s
            'send_chat': { max: 5, window: 60000 },    // 5 messages per minute
            'attack_monster': { max: 50, window: 60000 } // 50 attacks per minute
        };
    }

    /**
     * Check if action is allowed
     */
    check(userId, action) {
        const now = Date.now();
        const limit = this.limits[action];
        
        if (!limit) {
            // No limit defined, allow
            return { allowed: true };
        }

        // Get user's request history
        if (!this.requests.has(userId)) {
            this.requests.set(userId, new Map());
        }
        
        const userRequests = this.requests.get(userId);
        
        if (!userRequests.has(action)) {
            userRequests.set(action, []);
        }
        
        const timestamps = userRequests.get(action);
        
        // Remove old timestamps outside window
        const validTimestamps = timestamps.filter(t => now - t < limit.window);
        
        // Check if exceeded limit
        if (validTimestamps.length >= limit.max) {
            // Rate limit exceeded
            this.recordSuspiciousActivity(userId, action);
            
            return {
                allowed: false,
                reason: `Rate limit exceeded: ${action} (${limit.max} per ${limit.window}ms)`,
                retryAfter: validTimestamps[0] + limit.window - now
            };
        }
        
        // Add current timestamp
        validTimestamps.push(now);
        userRequests.set(action, validTimestamps);
        
        return { allowed: true };
    }

    /**
     * Record suspicious activity
     */
    recordSuspiciousActivity(userId, action) {
        const count = (this.suspiciousActivity.get(userId) || 0) + 1;
        this.suspiciousActivity.set(userId, count);
        
        console.warn(`[RateLimit] Suspicious activity from user ${userId}: ${action} (count: ${count})`);
        
        // Auto-ban if too many violations
        if (count >= 10) {
            console.error(`[RateLimit] User ${userId} exceeded suspicious activity threshold! Consider banning.`);
            // TODO: Implement auto-ban
        }
    }

    /**
     * Clear user's rate limit (e.g., when they disconnect)
     */
    clear(userId) {
        this.requests.delete(userId);
        this.suspiciousActivity.delete(userId);
    }

    /**
     * Cleanup old data (run periodically)
     */
    cleanup() {
        const now = Date.now();
        let cleaned = 0;
        
        for (const [userId, userRequests] of this.requests.entries()) {
            for (const [action, timestamps] of userRequests.entries()) {
                const limit = this.limits[action];
                if (!limit) continue;
                
                const validTimestamps = timestamps.filter(t => now - t < limit.window);
                
                if (validTimestamps.length === 0) {
                    userRequests.delete(action);
                    cleaned++;
                } else {
                    userRequests.set(action, validTimestamps);
                }
            }
            
            if (userRequests.size === 0) {
                this.requests.delete(userId);
            }
        }
        
        if (cleaned > 0) {
            console.log(`[RateLimit] Cleaned up ${cleaned} expired entries`);
        }
    }

    /**
     * Get suspicious users
     */
    getSuspiciousUsers() {
        const suspicious = [];
        for (const [userId, count] of this.suspiciousActivity.entries()) {
            if (count >= 5) {
                suspicious.push({ userId, violations: count });
            }
        }
        return suspicious;
    }
}

module.exports = new AdvancedRateLimiter();
