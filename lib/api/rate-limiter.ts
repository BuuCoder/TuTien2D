/**
 * Rate Limiter - Ensures only one request per user at a time
 * Uses in-memory Map for tracking active requests
 */

interface LockInfo {
    timestamp: number;
    requestId: string;
}

class RateLimiter {
    private activeLocks: Map<string, LockInfo> = new Map();
    private readonly LOCK_TIMEOUT_MS = 30000; // 30 seconds

    /**
     * Try to acquire a lock for the user
     * @param userId - User identifier (IP address or session ID)
     * @returns true if lock acquired, false if user already has active request
     */
    acquireLock(userId: string): boolean {
        this.cleanupStaleLocks();

        if (this.activeLocks.has(userId)) {
            const lock = this.activeLocks.get(userId)!;
            const age = Date.now() - lock.timestamp;

            // If lock is still fresh, deny the request
            if (age < this.LOCK_TIMEOUT_MS) {
                console.log(`[RateLimiter] Lock denied for ${userId} - active request exists`);
                return false;
            }

            // Lock is stale, remove it
            console.log(`[RateLimiter] Removing stale lock for ${userId}`);
            this.activeLocks.delete(userId);
        }

        // Acquire new lock
        const requestId = `${userId}-${Date.now()}`;
        this.activeLocks.set(userId, {
            timestamp: Date.now(),
            requestId
        });

        console.log(`[RateLimiter] Lock acquired for ${userId} (${requestId})`);
        return true;
    }

    /**
     * Release the lock for a user
     * @param userId - User identifier
     */
    releaseLock(userId: string): void {
        if (this.activeLocks.has(userId)) {
            const lock = this.activeLocks.get(userId)!;
            console.log(`[RateLimiter] Lock released for ${userId} (${lock.requestId})`);
            this.activeLocks.delete(userId);
        }
    }

    /**
     * Clean up stale locks that have exceeded timeout
     */
    private cleanupStaleLocks(): void {
        const now = Date.now();
        const staleUsers: string[] = [];

        for (const [userId, lock] of this.activeLocks.entries()) {
            if (now - lock.timestamp > this.LOCK_TIMEOUT_MS) {
                staleUsers.push(userId);
            }
        }

        staleUsers.forEach(userId => {
            console.log(`[RateLimiter] Cleaning up stale lock for ${userId}`);
            this.activeLocks.delete(userId);
        });
    }

    /**
     * Get number of active locks (for debugging)
     */
    getActiveLockCount(): number {
        this.cleanupStaleLocks();
        return this.activeLocks.size;
    }
}

// Singleton instance
export const rateLimiter = new RateLimiter();
