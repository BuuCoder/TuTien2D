/**
 * Middleware để tự động deobfuscate requests
 * Sử dụng trong API routes
 */

const SECRET_PATTERN = [0x4B, 0x69, 0x72, 0x6F, 0x32, 0x44]; // "Kiro2D" in hex

/**
 * Deobfuscate request body (server-side)
 */
function deobfuscateRequest(obfuscated) {
  try {
    // 1. Split checksum
    const [checksum, reversed] = obfuscated.split('.');
    
    // 2. Verify checksum
    if (simpleChecksum(reversed) !== checksum) {
      throw new Error('Invalid checksum');
    }
    
    // 3. Reverse string
    const base64 = reversed.split('').reverse().join('');
    
    // 4. Base64 decode
    const withPadding = Uint8Array.from(Buffer.from(base64, 'base64'));
    
    // 5. Remove padding (first 4 bytes)
    const xored = withPadding.slice(4);
    
    // 6. XOR with secret pattern
    const bytes = new Uint8Array(xored.length);
    for (let i = 0; i < xored.length; i++) {
      bytes[i] = xored[i] ^ SECRET_PATTERN[i % SECRET_PATTERN.length];
    }
    
    // 7. Convert to string
    const json = Buffer.from(bytes).toString('utf8');
    
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
 * Middleware function
 * Tự động deobfuscate nếu request có header X-Obfuscated
 */
async function deobfuscateMiddleware(request) {
  try {
    const isObfuscated = request.headers.get('X-Obfuscated') === '1';
    
    if (!isObfuscated) {
      // Request không được obfuscate, parse bình thường
      return await request.json();
    }
    
    // Request được obfuscate, cần deobfuscate
    const body = await request.json();
    
    if (!body._ || typeof body._ !== 'string') {
      throw new Error('Invalid obfuscated request format');
    }
    
    // Deobfuscate
    const deobfuscated = deobfuscateRequest(body._);
    
    console.log('[Deobfuscator] ✓ Request deobfuscated successfully');
    
    return deobfuscated;
    
  } catch (error) {
    console.error('[Deobfuscator] Error processing request:', error.message);
    throw error;
  }
}

/**
 * Helper: Parse request body (auto-detect obfuscation)
 */
async function parseRequestBody(request) {
  return await deobfuscateMiddleware(request);
}

module.exports = {
  deobfuscateRequest,
  deobfuscateMiddleware,
  parseRequestBody
};
