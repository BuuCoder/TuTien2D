# Request ID System - Idempotency

## Ngày cập nhật: 2025-12-03

## Vấn đề

Khi user spam click hoặc network lag, một request có thể được gửi nhiều lần:

```
User clicks Heal 3 times rapidly
    ↓
3 API calls sent
    ↓
Server processes all 3
    ↓
HP healed 3 times (wrong!)
MP deducted 3 times (wrong!)
```

**Hậu quả:**
- ❌ Duplicate processing
- ❌ Gold/HP/MP bị tính sai
- ❌ Database inconsistency

## Giải pháp: Request ID (Idempotency)

Mỗi request có một **unique ID**. Server chỉ xử lý request một lần duy nhất.

```
User clicks Heal 3 times rapidly
    ↓
3 API calls with SAME request ID
    ↓
Server processes ONLY the first one
    ↓
Other 2 requests rejected (duplicate)
    ↓
HP healed 1 time (correct!)
```

---

## Implementation

### 1. Database Table

```sql
CREATE TABLE processed_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    request_id VARCHAR(255) UNIQUE NOT NULL,
    user_id INT NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    INDEX idx_request_id (request_id),
    INDEX idx_user_id (user_id),
    INDEX idx_expires_at (expires_at)
);
```

**Purpose:**
- Lưu các request đã xử lý
- `request_id` UNIQUE → không thể insert duplicate
- `expires_at` → auto cleanup sau 1 giờ

### 2. Generate Request ID (Client)

```typescript
// lib/requestId.ts
export function generateRequestId(userId?: number): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const userPart = userId ? `-${userId}` : '';
  return `${timestamp}-${random}${userPart}`;
}

// Example: "1701234567890-abc123xyz-42"
//           timestamp      random   userId
```

**Format:**
- `timestamp`: Đảm bảo unique theo thời gian
- `random`: Đảm bảo unique khi cùng timestamp
- `userId`: Optional, để dễ debug

### 3. Check Request ID (Server)

```javascript
// lib/requestIdMiddleware.js
async function checkRequestId(requestId, userId, actionType) {
  // Check xem request đã được xử lý chưa
  const [existing] = await db.query(
    'SELECT id FROM processed_requests WHERE request_id = ? AND user_id = ?',
    [requestId, userId]
  );

  if (existing.length > 0) {
    // Duplicate!
    return {
      valid: false,
      error: 'Request đã được xử lý',
      isDuplicate: true
    };
  }

  // Lưu request ID
  await db.query(
    'INSERT INTO processed_requests (request_id, user_id, action_type, expires_at) VALUES (?, ?, ?, ?)',
    [requestId, userId, actionType, expiresAt]
  );

  return { valid: true };
}
```

### 4. Use in API

```javascript
// app/api/player/heal/route.js
export async function POST(req) {
  const { userId, token, skillId, requestId } = await req.json();

  // Verify token...

  // Check request ID
  const requestCheck = await checkRequestId(requestId, userId, 'heal');
  if (!requestCheck.valid) {
    if (requestCheck.isDuplicate) {
      // Duplicate - return success but don't process
      return NextResponse.json({
        success: true,
        message: 'Request đã được xử lý trước đó',
        isDuplicate: true
      });
    }
    return NextResponse.json({ error: requestCheck.error }, { status: 400 });
  }

  // Process request...
}
```

### 5. Use in Client

```typescript
// components/CombatManager.tsx
const handleHeal = async () => {
  const requestId = generateRequestId(user?.id);
  
  const response = await fetch('/api/player/heal', {
    method: 'POST',
    body: JSON.stringify({
      userId: user?.id,
      token: user?.socketToken,
      skillId: 'heal',
      requestId: requestId  // ← Unique request ID
    })
  });

  const data = await response.json();
  
  if (data.isDuplicate) {
    console.log('Request was already processed');
    return; // Don't update UI again
  }

  // Update UI...
};
```

---

## Flow Diagram

### First Request (Success)
```
Client generates requestId: "1701234567890-abc123-42"
    ↓
Send to server
    ↓
Server checks: SELECT * FROM processed_requests WHERE request_id = "..."
    ↓
Not found → Process request
    ↓
INSERT INTO processed_requests (request_id, ...)
    ↓
Process heal: HP +50, MP -20
    ↓
Return success
```

### Duplicate Request (Rejected)
```
Client sends SAME requestId: "1701234567890-abc123-42"
    ↓
Send to server
    ↓
Server checks: SELECT * FROM processed_requests WHERE request_id = "..."
    ↓
Found! → Duplicate detected
    ↓
Return { success: true, isDuplicate: true }
    ↓
Client ignores (already processed)
```

---

## Race Condition Handling

Nếu 2 requests đến cùng lúc:

```
Request A arrives → Check DB → Not found → Start processing
Request B arrives → Check DB → Not found → Start processing
    ↓
Request A: INSERT INTO processed_requests → Success
Request B: INSERT INTO processed_requests → ERROR: Duplicate key
    ↓
Request A: Continue processing
Request B: Catch error → Return duplicate
```

**Code:**
```javascript
try {
  await db.query('INSERT INTO processed_requests ...');
} catch (error) {
  if (error.code === 'ER_DUP_ENTRY') {
    // Race condition - another request won
    return { valid: false, isDuplicate: true };
  }
  throw error;
}
```

---

## Cleanup

Expired requests (> 1 hour) được cleanup tự động:

```javascript
// Run periodically (e.g., every 10 minutes)
async function cleanupExpiredRequests() {
  const [result] = await db.query(
    'DELETE FROM processed_requests WHERE expires_at < NOW()'
  );
  console.log(`Cleaned up ${result.affectedRows} expired requests`);
}

// In server.js
setInterval(cleanupExpiredRequests, 10 * 60 * 1000); // 10 minutes
```

---

## Benefits

1. ✅ **Idempotency**
   - Same request → Same result
   - No duplicate processing

2. ✅ **Prevent Spam**
   - User spam click → Only 1 processed
   - Network retry → Only 1 processed

3. ✅ **Data Integrity**
   - Gold/HP/MP correct
   - No duplicate transactions

4. ✅ **Race Condition Safe**
   - UNIQUE constraint in database
   - Catch duplicate key error

---

## Testing

### Test 1: Duplicate Request
```javascript
const requestId = generateRequestId(1);

// First request
await fetch('/api/player/heal', {
  body: JSON.stringify({ userId: 1, requestId })
});
// Expected: ✅ Success, HP healed

// Second request (same ID)
await fetch('/api/player/heal', {
  body: JSON.stringify({ userId: 1, requestId })
});
// Expected: ✅ Success but isDuplicate: true, HP NOT healed again
```

### Test 2: Rapid Clicks
```javascript
// User clicks 5 times rapidly
for (let i = 0; i < 5; i++) {
  handleHeal(); // Same requestId
}
// Expected: ✅ Only 1 heal processed
```

### Test 3: Network Retry
```javascript
// Network fails, browser retries
fetch('/api/player/heal', { body: JSON.stringify({ requestId: "..." }) });
// Retry with same requestId
fetch('/api/player/heal', { body: JSON.stringify({ requestId: "..." }) });
// Expected: ✅ Only 1 processed
```

---

## Apply to All APIs

Request ID nên được dùng cho TẤT CẢ các API có side effects:

- ✅ `/api/player/heal` - Heal HP
- ✅ `/api/player/use-skill` - Use skill
- ✅ `/api/player/take-damage` - Take damage
- ✅ `/api/player/add-gold` - Add gold
- ✅ `/api/player/update-max-stats` - Update max stats
- ✅ `/api/player/regen-mp` - Regen MP

**NOT needed for:**
- ❌ `/api/player/get-stats` - Read-only
- ❌ `/api/auth/login` - Has own idempotency (session)

---

## Summary

**Key Points:**
- ✅ Mỗi request có unique ID
- ✅ Server chỉ xử lý 1 lần
- ✅ Duplicate requests bị reject
- ✅ Race condition safe
- ✅ Auto cleanup sau 1 giờ

**Files:**
- `database/create_processed_requests.sql` - Database table
- `lib/requestIdMiddleware.js` - Server-side check
- `lib/requestId.ts` - Client-side generate
- `app/api/player/heal/route.js` - Example usage

**Result:**
- No duplicate processing
- Data integrity
- Better security
