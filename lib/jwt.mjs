import jwt from 'jsonwebtoken';

// Secret key - trong production nên lưu trong environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '24h';

console.log('[JWT.mjs] JWT_SECRET loaded:', JWT_SECRET ? `${JWT_SECRET.substring(0, 10)}...` : 'NOT SET');

/**
 * Tạo JWT token cho user
 */
export function generateToken(userId, username, sessionId) {
    return jwt.sign(
        {
            userId,
            username,
            sessionId,
            type: 'socket_auth'
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
}

/**
 * Xác thực JWT token
 */
export function verifyToken(token) {
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return { valid: true, data: decoded };
    } catch (error) {
        return { valid: false, error: error.message };
    }
}

export { JWT_SECRET };
