const crypto = require('crypto');

// Secret key - PHẢI được lưu trong .env và KHÔNG được commit lên git
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-gcm';

/**
 * Mã hóa data
 * @param {Object} data - Data cần mã hóa
 * @returns {string} - Encrypted string (base64)
 */
function encrypt(data) {
    try {
        const text = JSON.stringify(data);
        
        // Generate IV (Initialization Vector)
        const iv = crypto.randomBytes(16);
        
        // Create cipher
        const key = Buffer.from(ENCRYPTION_KEY, 'hex');
        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
        
        // Encrypt
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        // Get auth tag
        const authTag = cipher.getAuthTag();
        
        // Combine: iv + authTag + encrypted
        const result = {
            iv: iv.toString('hex'),
            authTag: authTag.toString('hex'),
            encrypted: encrypted
        };
        
        // Return as base64
        return Buffer.from(JSON.stringify(result)).toString('base64');
        
    } catch (error) {
        console.error('[Encryption] Error encrypting:', error);
        throw new Error('Encryption failed');
    }
}

/**
 * Giải mã data
 * @param {string} encryptedData - Encrypted string (base64)
 * @returns {Object} - Decrypted data
 */
function decrypt(encryptedData) {
    try {
        // Decode base64
        const decoded = Buffer.from(encryptedData, 'base64').toString('utf8');
        const { iv, authTag, encrypted } = JSON.parse(decoded);
        
        // Create decipher
        const key = Buffer.from(ENCRYPTION_KEY, 'hex');
        const decipher = crypto.createDecipheriv(
            ALGORITHM,
            key,
            Buffer.from(iv, 'hex')
        );
        
        // Set auth tag
        decipher.setAuthTag(Buffer.from(authTag, 'hex'));
        
        // Decrypt
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        // Parse JSON
        return JSON.parse(decrypted);
        
    } catch (error) {
        console.error('[Encryption] Error decrypting:', error);
        throw new Error('Decryption failed');
    }
}

/**
 * Generate encryption key (chỉ dùng 1 lần để tạo key mới)
 */
function generateKey() {
    return crypto.randomBytes(32).toString('hex');
}

module.exports = {
    encrypt,
    decrypt,
    generateKey
};
