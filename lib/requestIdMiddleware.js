const db = require('./db');

/**
 * Middleware để check và lưu request ID
 * Tránh duplicate requests (idempotency)
 */
async function checkRequestId(requestId, userId, actionType) {
    if (!requestId) {
        return {
            valid: false,
            error: 'Request ID không được cung cấp'
        };
    }

    // Validate format: uuid hoặc timestamp-random
    if (typeof requestId !== 'string' || requestId.length < 10 || requestId.length > 255) {
        return {
            valid: false,
            error: 'Request ID không hợp lệ'
        };
    }

    try {
        // Check xem request đã được xử lý chưa
        const [existing] = await db.query(
            'SELECT id FROM processed_requests WHERE request_id = ? AND user_id = ?',
            [requestId, userId]
        );

        if (existing.length > 0) {
            console.log(`[RequestID] Duplicate request detected: ${requestId} from user ${userId}`);
            return {
                valid: false,
                error: 'Request đã được xử lý',
                isDuplicate: true
            };
        }

        // Lưu request ID (expires sau 1 giờ)
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        await db.query(
            'INSERT INTO processed_requests (request_id, user_id, action_type, expires_at) VALUES (?, ?, ?, ?)',
            [requestId, userId, actionType, expiresAt]
        );

        console.log(`[RequestID] Processed: ${requestId} for user ${userId} action ${actionType}`);

        return {
            valid: true
        };

    } catch (error) {
        console.error('[RequestID] Error checking request ID:', error);
        
        // Nếu là duplicate key error (race condition), coi như duplicate
        if (error.code === 'ER_DUP_ENTRY') {
            return {
                valid: false,
                error: 'Request đã được xử lý',
                isDuplicate: true
            };
        }

        return {
            valid: false,
            error: 'Lỗi kiểm tra request ID'
        };
    }
}

/**
 * Cleanup expired requests (gọi định kỳ)
 */
async function cleanupExpiredRequests() {
    try {
        const [result] = await db.query(
            'DELETE FROM processed_requests WHERE expires_at < NOW()'
        );
        
        if (result.affectedRows > 0) {
            console.log(`[RequestID] Cleaned up ${result.affectedRows} expired requests`);
        }
    } catch (error) {
        console.error('[RequestID] Error cleaning up expired requests:', error);
    }
}

module.exports = {
    checkRequestId,
    cleanupExpiredRequests
};
