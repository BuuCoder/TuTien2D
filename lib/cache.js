/**
 * Simple in-memory cache for frequently accessed data
 */

class Cache {
    constructor() {
        this.data = new Map();
        this.ttl = new Map(); // Time to live
        
        // Cleanup expired entries every 30 seconds
        setInterval(() => {
            this.cleanup();
        }, 30000);
    }

    /**
     * Set cache with TTL (time to live in milliseconds)
     */
    set(key, value, ttlMs = 60000) {
        this.data.set(key, value);
        this.ttl.set(key, Date.now() + ttlMs);
    }

    /**
     * Get cached value
     */
    get(key) {
        const expiry = this.ttl.get(key);
        
        // Check if expired
        if (!expiry || Date.now() > expiry) {
            this.data.delete(key);
            this.ttl.delete(key);
            return null;
        }
        
        return this.data.get(key);
    }

    /**
     * Delete cache entry
     */
    delete(key) {
        this.data.delete(key);
        this.ttl.delete(key);
    }

    /**
     * Clear all cache
     */
    clear() {
        this.data.clear();
        this.ttl.clear();
    }

    /**
     * Cleanup expired entries
     */
    cleanup() {
        const now = Date.now();
        let cleaned = 0;
        
        for (const [key, expiry] of this.ttl.entries()) {
            if (now > expiry) {
                this.data.delete(key);
                this.ttl.delete(key);
                cleaned++;
            }
        }
        
        if (cleaned > 0) {
            console.log(`[Cache] Cleaned ${cleaned} expired entries`);
        }
    }

    /**
     * Get cache stats
     */
    getStats() {
        return {
            size: this.data.size,
            keys: Array.from(this.data.keys())
        };
    }
}

module.exports = new Cache();
