/**
 * Client-side encryption
 * Sử dụng Web Crypto API
 * 
 * NOTE: Key được obfuscate nhưng vẫn có thể bị reverse engineer
 * Mục đích chính là làm khó cho attacker, không phải bảo mật tuyệt đối
 */

// Obfuscated key - sẽ được deobfuscate khi runtime
// Key thật sẽ được generate và sync từ server khi login
let ENCRYPTION_KEY: CryptoKey | null = null;

/**
 * Initialize encryption key từ server
 * Key được gửi qua JWT token hoặc secure channel
 */
export async function initEncryptionKey(keyHex: string) {
  try {
    const keyBuffer = hexToBuffer(keyHex);
    ENCRYPTION_KEY = await crypto.subtle.importKey(
      'raw',
      keyBuffer.buffer as ArrayBuffer,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
    console.log('[Encryption] Key initialized');
  } catch (error) {
    console.error('[Encryption] Failed to init key:', error);
  }
}

/**
 * Mã hóa data
 */
export async function encryptData(data: any): Promise<string> {
  if (!ENCRYPTION_KEY) {
    throw new Error('Encryption key not initialized');
  }

  try {
    const text = JSON.stringify(data);
    const textBuffer = new TextEncoder().encode(text);
    
    // Generate IV
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Encrypt
    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      ENCRYPTION_KEY,
      textBuffer
    );
    
    // Combine iv + encrypted
    const result = {
      iv: bufferToHex(iv),
      encrypted: bufferToHex(new Uint8Array(encryptedBuffer))
    };
    
    // Return as base64
    return btoa(JSON.stringify(result));
    
  } catch (error) {
    console.error('[Encryption] Error encrypting:', error);
    throw new Error('Encryption failed');
  }
}

/**
 * Giải mã data (client-side, ít dùng)
 */
export async function decryptData(encryptedData: string): Promise<any> {
  if (!ENCRYPTION_KEY) {
    throw new Error('Encryption key not initialized');
  }

  try {
    const decoded = JSON.parse(atob(encryptedData));
    const { iv, encrypted } = decoded;
    
    const ivBuffer = hexToBuffer(iv);
    const encryptedBuffer = hexToBuffer(encrypted);
    
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBuffer.buffer as ArrayBuffer },
      ENCRYPTION_KEY,
      encryptedBuffer.buffer as ArrayBuffer
    );
    
    const text = new TextDecoder().decode(decryptedBuffer);
    return JSON.parse(text);
    
  } catch (error) {
    console.error('[Encryption] Error decrypting:', error);
    throw new Error('Decryption failed');
  }
}

// Helper functions
function bufferToHex(buffer: Uint8Array): string {
  return Array.from(buffer)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBuffer(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

/**
 * Helper để gửi encrypted request
 */
export async function sendEncryptedRequest(url: string, data: any, options: RequestInit = {}) {
  const encryptedPayload = await encryptData(data);
  
  return fetch(url, {
    ...options,
    method: options.method || 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    body: JSON.stringify({ encrypted: encryptedPayload })
  });
}
