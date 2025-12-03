# Security Best Practices

## Tại sao KHÔNG nên mã hóa ở client?

### Vấn đề với Client-side Encryption:

```javascript
// ❌ Client-side encryption (VÔ NGHĨA)
const encrypted = encrypt(data, SECRET_KEY);
fetch('/api/endpoint', { body: encrypted });
```

**Tại sao vô nghĩa?**
1. ❌ **JavaScript code có thể xem được**
   - View source → Thấy encryption code
   - DevTools → Thấy encryption key
   - Reverse engineer → Hiểu algorithm

2. ❌ **Key phải có ở client**
   - Key trong code → Attacker lấy được
   - Key từ server → Attacker intercept được
   - Obfuscation → Chỉ làm khó, không ngăn được

3. ❌ **Attacker có thể:**
   - Copy encryption code
   - Extract key
   - Tạo fake requests với encryption đúng
   - Bypass hoàn toàn

### Ví dụ Attack:

```javascript
// Attacker mở DevTools Console:
// 1. Tìm encryption function
console.log(window.encrypt); // Found!

// 2. Tìm key
console.log(ENCRYPTION_KEY); // Found!

// 3. Tạo fake request
const fakeData = { gold: 999999 };
const encrypted = encrypt(fakeData, ENCRYPTION_KEY);
fetch('/api/add-gold', { body: encrypted });
// → Thành công! Vì server tin tưởng encrypted data
```

---

## Giải pháp đúng: Server-side Security

### 1. ✅ Server-side Processing

**Nguyên tắc:** Client chỉ gửi **minimal data**, server tự validate và tính toán.

```javascript
// ❌ SAI: Client gửi gold amount
fetch('/api/add-gold', {
  body: JSON.stringify({ amount: 999999 }) // Client có thể fake
});

// ✅ ĐÚNG: Client chỉ gửi monsterId
socket.emit('pickup_gold', { monsterId: 'monster-123' });

// Server tự validate và tính toán:
const monster = getMonster(monsterId);
if (!monster.isDead) return; // Validate
const goldAmount = monster.goldDrop; // Server quyết định
const newGold = currentGold + goldAmount; // Server tính toán
```

### 2. ✅ Request ID (Idempotency)

**Nguyên tắc:** Mỗi request chỉ xử lý 1 lần.

```javascript
// Client
const requestId = generateRequestId();
fetch('/api/heal', { body: { requestId, ...data } });

// Server
const exists = await checkRequestId(requestId);
if (exists) return; // Duplicate, reject
await saveRequestId(requestId);
// Process...
```

### 3. ✅ Rate Limiting

**Nguyên tắc:** Giới hạn số lượng requests.

```javascript
// Server
const rateLimiter = new RateLimiter();

socket.on('pickup_gold', (data) => {
  const check = rateLimiter.check(userId, 'pickup_gold');
  if (!check.allowed) {
    return; // Rate limit exceeded
  }
  // Process...
});
```

**Limits:**
- Pickup gold: 10/minute
- Use skill: 30/minute
- Send chat: 5/minute
- Move: 100/10s

### 4. ✅ Server-side Validation

**Nguyên tắc:** KHÔNG BAO GIỜ tin tưởng data từ client.

```javascript
// ❌ SAI: Tin tưởng damage từ client
const damage = data.damage; // Client gửi 999999
applyDamage(target, damage); // Chết ngay!

// ✅ ĐÚNG: Server tính damage
const skill = SKILLS[data.skillId];
const damage = calculateDamage(skill, attacker, target);
applyDamage(target, damage);
```

**Validate:**
- ✅ Monster exists?
- ✅ Monster is dead?
- ✅ Monster has gold?
- ✅ Gold amount reasonable? (< 10000)
- ✅ Skill exists?
- ✅ MP enough?
- ✅ Damage reasonable?
- ✅ Position valid? (anti-teleport)

### 5. ✅ Socket.IO thay vì HTTP API

**Nguyên tắc:** Real-time events thay vì HTTP requests.

```javascript
// ❌ SAI: HTTP API (dễ fake)
fetch('/api/add-gold', { body: { amount: 999 } });

// ✅ ĐÚNG: Socket.IO (server control)
socket.emit('pickup_gold', { monsterId });
// Server validates và xử lý
```

**Ưu điểm:**
- Server kiểm soát hoàn toàn
- Client không thể fake logic
- Real-time, nhanh hơn
- Ít overhead hơn

---

## Security Layers

### Layer 1: Authentication
```javascript
// JWT token
const token = verifyToken(req.token);
if (!token.valid) return 401;
```

### Layer 2: Authorization
```javascript
// Check user owns resource
if (resource.userId !== token.userId) return 403;
```

### Layer 3: Rate Limiting
```javascript
// Limit requests
if (!rateLimiter.check(userId, action)) return 429;
```

### Layer 4: Request ID
```javascript
// Prevent duplicates
if (await isProcessed(requestId)) return 200;
```

### Layer 5: Validation
```javascript
// Validate all inputs
if (!validate(data)) return 400;
```

### Layer 6: Server-side Logic
```javascript
// Server calculates everything
const result = serverCalculate(data);
```

---

## Anti-Cheat Measures

### 1. Gold Cheat Prevention

```javascript
// ❌ Vulnerable
socket.on('add_gold', ({ amount }) => {
  gold += amount; // Client controls amount!
});

// ✅ Protected
socket.on('pickup_gold', ({ monsterId }) => {
  const monster = getMonster(monsterId);
  if (!monster.isDead || !monster.goldDrop) return;
  const amount = monster.goldDrop; // Server controls
  gold += amount;
  delete monster.goldDrop; // Can't pickup twice
});
```

### 2. Damage Cheat Prevention

```javascript
// ❌ Vulnerable
socket.on('attack', ({ targetId, damage }) => {
  applyDamage(targetId, damage); // Client controls damage!
});

// ✅ Protected
socket.on('attack', ({ targetId, skillId }) => {
  const skill = SKILLS[skillId];
  const damage = calculateDamage(skill, attacker); // Server calculates
  applyDamage(targetId, damage);
});
```

### 3. Speed Hack Prevention

```javascript
// ✅ Validate movement speed
socket.on('player_move', ({ x, y }) => {
  const distance = calculateDistance(lastPos, { x, y });
  const maxDistance = MAX_SPEED * deltaTime;
  
  if (distance > maxDistance * 1.5) {
    console.warn('Speed hack detected!');
    return; // Reject
  }
  
  updatePosition(x, y);
});
```

### 4. Teleport Hack Prevention

```javascript
// ✅ Validate position
socket.on('player_move', ({ x, y }) => {
  if (x < 0 || x > MAP_WIDTH || y < 0 || y > MAP_HEIGHT) {
    console.warn('Teleport hack detected!');
    return; // Reject
  }
  
  updatePosition(x, y);
});
```

---

## Monitoring & Logging

### 1. Log Suspicious Activity

```javascript
if (violations > 5) {
  console.error(`[Security] User ${userId} suspicious activity: ${action}`);
  // Alert admin
  // Consider auto-ban
}
```

### 2. Track Rate Limit Violations

```javascript
const suspiciousUsers = rateLimiter.getSuspiciousUsers();
// → [{ userId: 123, violations: 10 }]
```

### 3. Monitor Unusual Patterns

```javascript
// Unusual gold gain
if (goldGained > 10000 in 1 minute) {
  alert('Possible gold hack');
}

// Unusual damage
if (damage > maxPossibleDamage) {
  alert('Possible damage hack');
}
```

---

## Summary

### ❌ KHÔNG làm:
- Client-side encryption (vô nghĩa)
- Tin tưởng data từ client
- Để client tính toán logic
- HTTP API cho game actions

### ✅ NÊN làm:
- Server-side processing
- Server-side validation
- Request ID (idempotency)
- Rate limiting
- Socket.IO events
- Monitoring & logging

### Nguyên tắc vàng:

> **"Never trust the client. Always validate on server."**

Client có thể bị:
- Modify code
- Inject scripts
- Reverse engineer
- Fake requests

Server là **single source of truth**.
