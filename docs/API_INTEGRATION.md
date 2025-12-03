# API Integration - HP/MP Database Sync

## Ngày cập nhật: 2025-12-03

## Vấn đề

Trước đây, HP/MP chỉ được update ở client-side và không sync với database:
- ❌ Heal skill: Client tự tính toán HP mới
- ❌ Use skill: Client tự trừ MP
- ❌ Take damage: Client tự trừ HP
- ❌ Database không được update → Mất data khi reload

## Giải pháp

Tích hợp các API chuyên dụng vào client code để mọi thay đổi HP/MP đều được sync với database ngay lập tức.

---

## 1. Heal Skill Integration

### Trước (❌)
```typescript
// Client tự tính toán
const healAmount = Math.abs(skill.damage);
const newHp = Math.min(playerStats.maxHp, playerStats.currentHp + healAmount);
setPlayerStats({ 
  currentHp: newHp,
  mp: playerStats.mp - skill.manaCost 
});
// Database KHÔNG được update
```

### Bây giờ (✅)
```typescript
// Gọi API
const response = await fetch('/api/player/heal', {
  method: 'POST',
  body: JSON.stringify({
    userId: user.id,
    sessionId: user.sessionId,
    token: user.socketToken,
    skillId: 'heal'
  })
});

const data = await response.json();

if (data.success) {
  // Update từ server (đã validate và save vào database)
  setPlayerStats({ 
    currentHp: data.hp,    // ✅ Từ database
    mp: data.mp            // ✅ Từ database
  });
  
  console.log('Healed:', data.healed, 'HP');
}
```

**Benefits:**
- ✅ Server validate MP đủ không
- ✅ Server tính toán HP mới chính xác
- ✅ Database được update ngay lập tức
- ✅ Không thể cheat (gửi HP/MP giả)

---

## 2. Use Skill Integration

### Trước (❌)
```typescript
// Client tự trừ MP
setPlayerStats({ 
  mp: Math.max(0, playerStats.mp - skill.manaCost) 
});
// Database KHÔNG được update
```

### Bây giờ (✅)
```typescript
// Gọi API
const response = await fetch('/api/player/use-skill', {
  method: 'POST',
  body: JSON.stringify({
    userId: user.id,
    sessionId: user.sessionId,
    token: user.socketToken,
    skillId: 'fireball',
    targetType: 'monster'
  })
});

const data = await response.json();

if (data.success) {
  // Update MP từ server (đã validate và save vào database)
  setPlayerStats({ mp: data.mp });  // ✅ Từ database
  
  // Emit skill với damage từ server
  socket.emit('use_skill', {
    skillId: 'fireball',
    targetId: targetId,
    damage: data.damage  // ✅ Damage từ server
  });
}
```

**Benefits:**
- ✅ Server validate MP đủ không
- ✅ Server trả về damage chính xác
- ✅ Database được update ngay lập tức
- ✅ Không thể cheat MP hoặc damage

---

## 3. Take Damage Integration

### 3.1 Damage từ Player PK

#### Trước (❌)
```typescript
// Client tự trừ HP
const newHp = Math.max(0, playerStats.currentHp - data.damage);
setPlayerStats({ currentHp: newHp });
// Database KHÔNG được update
```

#### Bây giờ (✅)
```typescript
// Gọi API
const response = await fetch('/api/player/take-damage', {
  method: 'POST',
  body: JSON.stringify({
    userId: user.id,
    sessionId: user.sessionId,
    token: user.socketToken,
    attackerId: data.attackerId,
    skillId: data.skillId
  })
});

const result = await response.json();

if (result.success) {
  // Update HP từ server (đã validate và save vào database)
  setPlayerStats({ currentHp: result.hp });  // ✅ Từ database
  
  if (result.isDead) {
    handleDeath();
  }
}
```

### 3.2 Damage từ Monster

#### Trước (❌)
```typescript
// Client tự trừ HP
const newHp = Math.max(0, playerStats.currentHp - monsterDamage);
setPlayerStats({ currentHp: newHp });
// Database KHÔNG được update
```

#### Bây giờ (✅)
```typescript
// Gọi API
const response = await fetch('/api/player/take-damage', {
  method: 'POST',
  body: JSON.stringify({
    userId: user.id,
    sessionId: user.sessionId,
    token: user.socketToken,
    attackerId: null,  // Monster attack
    skillId: 'monster-attack'
  })
});

const result = await response.json();

if (result.success) {
  // Update HP từ server
  setPlayerStats({ currentHp: result.hp });  // ✅ Từ database
  
  if (result.isDead) {
    handleMonsterDeath();
  }
}
```

**Benefits:**
- ✅ Server validate damage dựa trên skillId
- ✅ Server tính HP mới chính xác
- ✅ Database được update ngay lập tức
- ✅ Không thể cheat (gửi damage giả)

---

## Files Changed

### Components
- **components/CombatManager.tsx**
  - Heal skill: Gọi `/api/player/heal`
  - Use skill: Gọi `/api/player/use-skill`
  - Take damage: Gọi `/api/player/take-damage`

- **components/MonsterManager.tsx**
  - Monster attack: Gọi `/api/player/take-damage`
  - Thêm `user` vào useGameStore

---

## Flow Diagram

### Heal Flow
```
User clicks Heal
    ↓
Check cooldown & MP (client-side)
    ↓
Call /api/player/heal
    ↓
Server validates:
  - Token valid?
  - MP enough?
    ↓
Server calculates:
  - New HP = min(current + heal, max)
  - New MP = current - cost
    ↓
Server updates database
    ↓
Server returns: { hp, mp, healed }
    ↓
Client updates UI
```

### Attack Flow
```
User clicks Attack skill
    ↓
Check cooldown & MP (client-side)
    ↓
Find target (PK player or monster)
    ↓
Call /api/player/use-skill
    ↓
Server validates:
  - Token valid?
  - MP enough?
    ↓
Server calculates:
  - Damage based on skillId
  - New MP = current - cost
    ↓
Server updates database
    ↓
Server returns: { mp, damage }
    ↓
Client updates MP
    ↓
Client emits skill to socket
    ↓
Target receives damage event
    ↓
Target calls /api/player/take-damage
    ↓
Server validates & updates target HP
```

---

## Testing

### Test 1: Heal updates database
```
1. Note current HP/MP in database
2. Use Heal skill
3. Check database immediately
4. Expected: ✅ HP increased, MP decreased in database
```

### Test 2: Attack updates MP in database
```
1. Note current MP in database
2. Use Fireball skill
3. Check database immediately
4. Expected: ✅ MP decreased by 20 in database
```

### Test 3: Take damage updates HP in database
```
1. Note current HP in database
2. Get hit by monster
3. Check database immediately
4. Expected: ✅ HP decreased in database
```

### Test 4: Reload preserves HP/MP
```
1. Use Heal skill (HP increases)
2. Reload page immediately
3. Login again
4. Expected: ✅ HP is the increased value (not old value)
```

### Test 5: Cannot cheat MP
```
1. Try to modify MP in browser console
2. Use skill
3. Expected: ❌ Server rejects if MP not enough
```

---

## Error Handling

### Not Enough MP
```typescript
const result = await healPlayer(auth, 'heal');

if (!result.success) {
  // Server response: { error: "Không đủ MP để sử dụng skill này", currentMp: 10 }
  setNotification({ message: result.error, type: 'error' });
}
```

### Token Invalid
```typescript
const result = await useSkill(auth, 'fireball');

if (!result.success) {
  // Server response: { error: "Token không hợp lệ" }
  // Redirect to login
  setUser(null);
}
```

### Network Error
```typescript
try {
  const result = await takeDamage(auth, attackerId, skillId);
} catch (error) {
  // Network error
  setNotification({ message: 'Lỗi kết nối server', type: 'error' });
}
```

---

## Performance

### API Calls Frequency

**Heal:**
- Cooldown: 10 seconds
- Max calls: ~6 per minute

**Attack Skills:**
- Cooldown: 1-8 seconds
- Max calls: ~10-60 per minute (depending on skill)

**Take Damage:**
- Depends on combat frequency
- Typical: ~5-20 per minute in active combat

**Total:**
- Idle: 0 calls/minute
- Light combat: ~10-20 calls/minute
- Heavy combat: ~30-50 calls/minute

**Compare to old AutoSave:**
- Old: 6 calls/minute (constant, even when idle)
- New: 0-50 calls/minute (only when needed)

---

## Benefits Summary

1. ✅ **Data Integrity**
   - HP/MP always synced with database
   - No data loss on reload

2. ✅ **Security**
   - Server-side validation
   - Cannot cheat HP/MP/damage

3. ✅ **Performance**
   - No unnecessary API calls when idle
   - Only call when action happens

4. ✅ **Consistency**
   - Single source of truth (database)
   - No race conditions

5. ✅ **User Experience**
   - Instant save
   - No delay
   - Reliable

---

## Future Improvements

1. **Batch API calls**
   - Combine multiple skill uses into one call
   - Reduce API calls in rapid combat

2. **Optimistic updates**
   - Update UI immediately
   - Rollback if API fails

3. **Offline support**
   - Queue API calls when offline
   - Sync when back online

4. **WebSocket for HP/MP sync**
   - Real-time sync without polling
   - Server can push HP/MP updates
