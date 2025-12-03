/**
 * Request Body Obfuscator
 * Làm khó đọc request body nhưng server vẫn decode được
 * 
 * Strategy: XOR + Base64 + Shuffle
 */

// Secret pattern - thay đổi định kỳ
const SECRET_PATTERN = [0x4B, 0x69, 0x72, 0x6F, 0x32, 0x44]; // "Kiro2D" in hex

/**
 * Obfuscate request body
 */
export function obfuscateRequest(data: any): string {
  try {
    // 1. Convert to JSON
    const json = JSON.stringify(data);
    
    // 2. Convert to bytes
    const bytes = new TextEncoder().encode(json);
    
    // 3. XOR with secret pattern
    const xored = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
      xored[i] = bytes[i] ^ SECRET_PATTERN[i % SECRET_PATTERN.length];
    }
    
    // 4. Add random padding
    const padding = crypto.getRandomValues(new Uint8Array(4));
    const withPadding = new Uint8Array(padding.length + xored.length);
    withPadding.set(padding, 0);
    withPadding.set(xored, padding.length);
    
    // 5. Base64 encode
    const base64 = btoa(String.fromCharCode(...withPadding));
    
    // 6. Reverse string (simple obfuscation)
    const reversed = base64.split('').reverse().join('');
    
    // 7. Add checksum
    const checksum = simpleChecksum(reversed);
    
    return `${checksum}.${reversed}`;
    
  } catch (error) {
    console.error('[Obfuscator] Error obfuscating:', error);
    throw error;
  }
}

/**
 * Deobfuscate request body (server-side)
 */
export function deobfuscateRequest(obfuscated: string): any {
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
    const withPadding = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    
    // 5. Remove padding (first 4 bytes)
    const xored = withPadding.slice(4);
    
    // 6. XOR with secret pattern
    const bytes = new Uint8Array(xored.length);
    for (let i = 0; i < xored.length; i++) {
      bytes[i] = xored[i] ^ SECRET_PATTERN[i % SECRET_PATTERN.length];
    }
    
    // 7. Convert to string
    const json = new TextDecoder().decode(bytes);
    
    // 8. Parse JSON
    return JSON.parse(json);
    
  } catch (error) {
    console.error('[Obfuscator] Error deobfuscating:', error);
    throw error;
  }
}

/**
 * Simple checksum
 */
function simpleChecksum(str: string): string {
  let sum = 0;
  for (let i = 0; i < str.length; i++) {
    sum = (sum + str.charCodeAt(i) * (i + 1)) % 65536;
  }
  return sum.toString(36);
}

/**
 * Helper: Send obfuscated request
 */
export async function sendObfuscatedRequest(
  url: string,
  data: any,
  options: RequestInit = {}
): Promise<Response> {
  const obfuscated = obfuscateRequest(data);
  
  return fetch(url, {
    ...options,
    method: options.method || 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Obfuscated': '1', // Flag để server biết cần deobfuscate
      ...options.headers
    },
    body: JSON.stringify({ _: obfuscated })
  });
}
