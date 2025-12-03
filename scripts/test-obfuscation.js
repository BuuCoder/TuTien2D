/**
 * Test Request Obfuscation
 * Chạy: node scripts/test-obfuscation.js
 */

const crypto = require('crypto');

const SECRET_PATTERN = [0x4B, 0x69, 0x72, 0x6F, 0x32, 0x44]; // "Kiro2D"

/**
 * Obfuscate request body
 */
function obfuscateRequest(data) {
  try {
    // 1. Convert to JSON
    const json = JSON.stringify(data);
    
    // 2. Convert to bytes
    const bytes = Buffer.from(json, 'utf8');
    
    // 3. XOR with secret pattern
    const xored = Buffer.alloc(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
      xored[i] = bytes[i] ^ SECRET_PATTERN[i % SECRET_PATTERN.length];
    }
    
    // 4. Add random padding
    const padding = crypto.randomBytes(4);
    const withPadding = Buffer.concat([padding, xored]);
    
    // 5. Base64 encode
    const base64 = withPadding.toString('base64');
    
    // 6. Reverse string
    const reversed = base64.split('').reverse().join('');
    
    // 7. Add checksum
    const checksum = simpleChecksum(reversed);
    
    return `${checksum}.${reversed}`;
    
  } catch (error) {
    console.error('[Obfuscator] Error:', error);
    throw error;
  }
}

/**
 * Deobfuscate request body
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
    console.error('[Deobfuscator] Error:', error);
    throw error;
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

// ============================================
// TESTS
// ============================================

console.log('='.repeat(60));
console.log('Testing Request Obfuscation');
console.log('='.repeat(60));
console.log('');

// Test 1: Simple object
console.log('Test 1: Simple Object');
const test1 = { userId: 123, token: 'abc123' };
console.log('Original:', test1);

const obfuscated1 = obfuscateRequest(test1);
console.log('Obfuscated:', obfuscated1);
console.log('Length:', obfuscated1.length);

const deobfuscated1 = deobfuscateRequest(obfuscated1);
console.log('Deobfuscated:', deobfuscated1);
console.log('Match:', JSON.stringify(test1) === JSON.stringify(deobfuscated1) ? '✓' : '✗');
console.log('');

// Test 2: Complex object
console.log('Test 2: Complex Object');
const test2 = {
  userId: 456,
  sessionId: 'session-xyz',
  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
  skillId: 'fireball',
  targetType: 'monster',
  position: { x: 100, y: 200 }
};
console.log('Original:', test2);

const obfuscated2 = obfuscateRequest(test2);
console.log('Obfuscated:', obfuscated2);
console.log('Length:', obfuscated2.length);

const deobfuscated2 = deobfuscateRequest(obfuscated2);
console.log('Deobfuscated:', deobfuscated2);
console.log('Match:', JSON.stringify(test2) === JSON.stringify(deobfuscated2) ? '✓' : '✗');
console.log('');

// Test 3: Login credentials
console.log('Test 3: Login Credentials');
const test3 = {
  username: 'player123',
  password: 'super-secret-password'
};
console.log('Original:', test3);

const obfuscated3 = obfuscateRequest(test3);
console.log('Obfuscated:', obfuscated3);
console.log('Length:', obfuscated3.length);

const deobfuscated3 = deobfuscateRequest(obfuscated3);
console.log('Deobfuscated:', deobfuscated3);
console.log('Match:', JSON.stringify(test3) === JSON.stringify(deobfuscated3) ? '✓' : '✗');
console.log('');

// Test 4: Invalid checksum
console.log('Test 4: Invalid Checksum (should fail)');
try {
  const tampered = obfuscated1.replace(/.$/, 'X'); // Thay đổi ký tự cuối
  deobfuscateRequest(tampered);
  console.log('✗ Should have failed!');
} catch (error) {
  console.log('✓ Correctly rejected:', error.message);
}
console.log('');

// Test 5: Performance
console.log('Test 5: Performance Test');
const iterations = 1000;
const testData = {
  userId: 123,
  sessionId: 'test-session',
  token: 'test-token-abc123',
  data: { x: 100, y: 200, hp: 100, mp: 50 }
};

console.log(`Running ${iterations} iterations...`);

const startObf = Date.now();
for (let i = 0; i < iterations; i++) {
  obfuscateRequest(testData);
}
const obfTime = Date.now() - startObf;

const obfData = obfuscateRequest(testData);
const startDeobf = Date.now();
for (let i = 0; i < iterations; i++) {
  deobfuscateRequest(obfData);
}
const deobfTime = Date.now() - startDeobf;

console.log(`Obfuscate: ${obfTime}ms (${(obfTime/iterations).toFixed(2)}ms per request)`);
console.log(`Deobfuscate: ${deobfTime}ms (${(deobfTime/iterations).toFixed(2)}ms per request)`);
console.log('');

// Test 6: Size comparison
console.log('Test 6: Size Comparison');
const originalSize = JSON.stringify(testData).length;
const obfuscatedSize = obfuscateRequest(testData).length;
const increase = ((obfuscatedSize - originalSize) / originalSize * 100).toFixed(1);

console.log(`Original size: ${originalSize} bytes`);
console.log(`Obfuscated size: ${obfuscatedSize} bytes`);
console.log(`Increase: ${increase}%`);
console.log('');

console.log('='.repeat(60));
console.log('✓ All tests completed!');
console.log('='.repeat(60));
