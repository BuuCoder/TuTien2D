/**
 * Server-side Request Deobfuscator
 * Giải mã request body đã được obfuscate từ client
 */

// Secret pattern - PHẢI GIỐNG với client
const SECRET_PATTERN = [0x4B, 0x69, 0x72, 0x6F, 0x32, 0x44]; // "Kiro2D"

/**
 * Deobfuscate request body
 */
function deobfuscateRequest(obfuscated) {
    try {
        // 1. Split checksum
        const parts = obfuscated.split('.');
        if (parts.length !== 2) {
            throw new Error('Invalid format');
        }
        
        const [checksum, reversed] = parts;
        
        // 2. Verify checksum
        if (simpleChecksum(reversed) !== checksum) {
            throw new Error('Invalid checksum');
        }
        
        // 3. Reverse string
        const base64 = reversed.split('').reverse().join('');
        
        // 4. Base64 decode
        const withPadding = Buffer.from(base64, 'base64');
        
        // 5. Remove padding (first 4 bytes)
        const xored = withPadding.slice(4);
        
        // 6. XOR with secret pattern
        const bytes = Buffer.alloc(xored.length);
        for (let i = 0; i < xored.length; i++) {
            bytes[i] = xored[i] ^ SECRET_PATTERN[i % SECRET_PATTERN.length];
        }
        
        // 7. Convert to string
        const json = bytes.toString('utf8');
        
        // 8. Parse JSON
        return JSON.parse(json);
        
    } catch (error) {
        console.error('[Deobfuscator] Error:', error.message);
        throw new Error('Deobfuscation failed');
    }
}

/**
 * Simple checksum
 */
function simpleChecksum(str) {
    let sum = 0;
    for (let i = 0; i < str.length; i++) {
        sum = (sum + str.charCodeAt(i) * (i + 1)) % 65536;
    }
    return sum.toString(36);
}

/**
 * Middleware để deobfuscate request body
 */
async function deobfuscateMiddleware(req) {
    try {
        // Check if request is obfuscated
        const isObfuscated = req.headers.get('x-obfuscated') === '1';
        
        if (!isObfuscated) {
            // Not obfuscated, return as is
            return await req.json();
        }
        
        // Get obfuscated body
        const body = await req.json();
        
        if (!body._ || typeof body._ !== 'string') {
            throw new Error('Invalid obfuscated body');
        }
        
        // Deobfuscate
        const deobfuscated = deobfuscateRequest(body._);
        
        console.log('[Deobfuscator] Request deobfuscated successfully');
        
        return deobfuscated;
        
    } catch (error) {
        console.error('[Deobfuscator] Failed to deobfuscate request:', error);
        throw error;
    }
}

module.exports = {
    deobfuscateRequest,
    deobfuscateMiddleware
};
