# 🔍 Verification Guide - Request Obfuscation

## Manual Testing Checklist

### Setup
1. Start dev server: `npm run dev`
2. Open browser: `http://localhost:4004`
3. Open DevTools → Network tab
4. Filter: XHR/Fetch

### Test Cases

#### ✅ 1. Login
**Action**: Login với username/password

**Expected Request**:
```json
POST /api/auth/login
{
  "_": "rqm.=YjZB01QKkSJQUFUH4yLdtBUFhndDUFUNIgNXxxBLBzu3w8L"
}
```

**NOT**:
```json
{
  "username": "player1",
  "password": "password123"
}
```

---

#### ✅ 2. Logout
**Action**: Click nút Logout

**Expected Request**:
```json
POST /api/auth/logout
{
  "_": "11fa.=IxDZtndI00CLdGdC4FSLNjZJVFUH..."
}
```

**NOT**:
```json
{
  "userId": 1,
  "sessionId": "...",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

#### ✅ 3. Heal Skill
**Action**: Press H (heal skill)

**Expected Request**:
```json
POST /api/player/heal
{
  "_": "16ul.P1kFbQyMBxxEZYGMX1REMgTaApgAcgjZI0kFbQyMBxxEZ..."
}
```

**NOT**:
```json
{
  "userId": 1,
  "skillId": "heal",
  "token": "..."
}
```

---

#### ✅ 4. Attack Skill
**Action**: 
1. Enable PK mode (P key)
2. Select target player
3. Press 1-6 (attack skill)

**Expected Request**:
```json
POST /api/player/use-skill
{
  "_": "rqm.=YjZB01QKkSJQUFUH..."
}
```

---

#### ✅ 5. Take Damage (Monster)
**Action**: Stand near monster, let it attack you

**Expected Request**:
```json
POST /api/player/take-damage
{
  "_": "11fa.=IxDZtndI00CLdGdC..."
}
```

**Check**: `attackerId` should be `null` (monster attack)

---

#### ✅ 6. Take Damage (PK)
**Action**: Get attacked by another player

**Expected Request**:
```json
POST /api/player/take-damage
{
  "_": "16ul.P1kFbQyMBxxEZYGMX..."
}
```

**Check**: `attackerId` should be player ID

---

#### ✅ 7. MP Regeneration
**Action**: Wait 10 seconds (auto MP regen)

**Expected Request**:
```json
POST /api/player/regen-mp
{
  "_": "rqm.=YjZB01QKkSJQUFUH..."
}
```

---

#### ✅ 8. Get Stats
**Action**: Refresh page (auto fetch stats)

**Expected Request**:
```json
POST /api/player/get-stats
{
  "_": "11fa.=IxDZtndI00CLdGdC..."
}
```

---

## Automated Verification

### Check All Requests
```javascript
// Paste in browser console after performing actions

// Get all XHR requests
const requests = performance.getEntriesByType('resource')
  .filter(r => r.initiatorType === 'fetch' && r.name.includes('/api/'));

console.log('Total API requests:', requests.length);

// Check if any request has plain JSON body
// (This requires checking actual request bodies in Network tab)
```

### Quick Test Script
```javascript
// Test obfuscation function directly in console
const testData = { userId: 123, token: 'abc' };

// Should see obfuscated string
console.log('Obfuscated:', obfuscateRequest(testData));
```

---

## Common Issues

### ❌ Request NOT Obfuscated
**Symptom**: Request body shows plain JSON

**Causes**:
1. Using `fetch()` instead of `sendObfuscatedRequest()`
2. Missing import in component
3. API route not using `parseRequestBody()`

**Fix**:
```typescript
// Wrong
fetch('/api/endpoint', {
  body: JSON.stringify(data)
});

// Correct
import { sendObfuscatedRequest } from '@/lib/requestObfuscator';
sendObfuscatedRequest('/api/endpoint', data);
```

---

### ❌ Server Error: "Deobfuscation failed"
**Symptom**: API returns 500 error

**Causes**:
1. SECRET_PATTERN mismatch
2. Missing `X-Obfuscated` header
3. Invalid request format

**Fix**:
1. Check `lib/requestObfuscator.ts` SECRET_PATTERN
2. Check `lib/deobfuscateMiddleware.js` SECRET_PATTERN
3. Ensure they match exactly

---

### ❌ Request Body Empty
**Symptom**: Request body is `{}`

**Causes**:
1. Data not passed to `sendObfuscatedRequest()`
2. Obfuscation failed silently

**Fix**:
```typescript
// Check console for errors
console.log('Data before obfuscation:', data);
const response = await sendObfuscatedRequest('/api/endpoint', data);
```

---

## Success Criteria

✅ **All requests should**:
1. Have `Content-Type: application/json`
2. Have `X-Obfuscated: 1` header
3. Have body format: `{ "_": "obfuscated_string" }`
4. Return successful responses
5. Work exactly like before (no functionality broken)

✅ **Network tab should show**:
- Request body: Obfuscated ✅
- Response body: Normal JSON ✅
- Status: 200 OK ✅

---

## Performance Check

### Expected Overhead
- Request obfuscation: ~0.02ms
- Request size increase: ~45%
- No noticeable lag

### Monitor
```javascript
// Measure obfuscation time
console.time('obfuscate');
sendObfuscatedRequest('/api/test', { test: 'data' });
console.timeEnd('obfuscate');
// Should be < 1ms
```

---

## Final Verification

### All Tests Pass ✅
- [ ] Login obfuscated
- [ ] Logout obfuscated
- [ ] Heal obfuscated
- [ ] Attack obfuscated
- [ ] Take damage obfuscated
- [ ] MP regen obfuscated
- [ ] Get stats obfuscated
- [ ] No console errors
- [ ] All features work normally

### Ready for Production ✅
```bash
npm run build:obfuscate
npm start
# Test again in production mode
```

---

**Last Updated**: December 2024
**Status**: All critical endpoints protected ✅
