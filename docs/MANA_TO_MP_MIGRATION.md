# Migration: Mana → MP

## Ngày cập nhật: 2025-12-03

## Vấn đề

Database sử dụng `mp` và `max_mp` nhưng code frontend đang dùng `currentMana` và `maxMana`, gây ra sự không đồng nhất.

## Giải pháp

Đổi tên tất cả các trường trong code để khớp với database schema:
- `currentMana` → `mp`
- `maxMana` → `maxMp`

## Database Schema

```sql
CREATE TABLE user_stats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    level INT DEFAULT 1,
    experience INT DEFAULT 0,
    hp INT DEFAULT 100,           -- Current HP
    max_hp INT DEFAULT 100,       -- Max HP
    mp INT DEFAULT 50,            -- Current MP (NOT mana!)
    max_mp INT DEFAULT 50,        -- Max MP (NOT max_mana!)
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

## Files Changed

### Core
- `lib/store.ts` - Interface PlayerStats và default values
- `lib/skillData.ts` - Interface và default values

### Components
- `components/LoginPage.tsx` - Xử lý response từ login API
- `components/CombatUI.tsx` - Hiển thị MP bar và check MP
- `components/CombatManager.tsx` - Logic combat và MP consumption
- `components/MultiplayerManager.tsx` - Respawn và MP restore
- `components/AutoSaveStats.tsx` - Save MP vào database

## Thay đổi chi tiết

### Before (❌ SAI)
```typescript
interface PlayerStats {
  maxHp: number;
  currentHp: number;
  maxMana: number;      // ❌ Không khớp với DB
  currentMana: number;  // ❌ Không khớp với DB
  attack: number;
  defense: number;
}

// Login response
setPlayerStats({
  currentHp: data.stats.hp,
  maxHp: data.stats.max_hp,
  currentMana: data.stats.mana,      // ❌ DB không có trường 'mana'
  maxMana: data.stats.max_mana,      // ❌ DB không có trường 'max_mana'
});

// Check mana
if (playerStats.currentMana < skill.manaCost) {
  // ...
}
```

### After (✅ ĐÚNG)
```typescript
interface PlayerStats {
  maxHp: number;
  currentHp: number;
  maxMp: number;   // ✅ Khớp với DB
  mp: number;      // ✅ Khớp với DB
  attack: number;
  defense: number;
}

// Login response
setPlayerStats({
  currentHp: data.stats.hp,
  maxHp: data.stats.max_hp,
  mp: data.stats.mp,          // ✅ Khớp với DB
  maxMp: data.stats.max_mp,   // ✅ Khớp với DB
});

// Check mana
if (playerStats.mp < skill.manaCost) {
  // ...
}
```

## API Response Format

### Login API (`/api/auth/login`)
```json
{
  "success": true,
  "user": { "id": 1, "username": "player1" },
  "sessionId": "abc123...",
  "socketToken": "jwt_token...",
  "inventory": { "gold": 1000, "items": [] },
  "stats": {
    "level": 1,
    "experience": 0,
    "hp": 100,        // Current HP
    "max_hp": 100,    // Max HP
    "mp": 50,         // Current MP ✅
    "max_mp": 50      // Max MP ✅
  }
}
```

### Get Stats API (`/api/player/get-stats`)
```json
{
  "success": true,
  "stats": {
    "hp": 85,
    "max_hp": 100,
    "mp": 30,         // ✅
    "max_mp": 50,     // ✅
    "level": 1,
    "experience": 0
  }
}
```

## LocalStorage Format

### Before (❌ SAI)
```json
{
  "currentHp": 100,
  "currentMana": 50,    // ❌
  "maxHp": 100,
  "maxMana": 50         // ❌
}
```

### After (✅ ĐÚNG)
```json
{
  "currentHp": 100,
  "mp": 50,             // ✅
  "maxHp": 100,
  "maxMp": 50           // ✅
}
```

**Note:** Code hỗ trợ backward compatibility để đọc format cũ:
```typescript
mp: stats.mp || stats.currentMana,        // Support old format
maxMp: stats.maxMp || stats.maxMana,      // Support old format
```

## Testing

### 1. Test Login
```bash
# Login và check response
curl -X POST http://localhost:4004/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"player1","password":"123456"}'

# Expected: stats.mp và stats.max_mp có giá trị
```

### 2. Test Combat
```typescript
// Check MP bar hiển thị đúng
console.log(playerStats.mp, playerStats.maxMp);

// Check skill usage trừ MP đúng
useSkill('fireball'); // Should consume 20 MP
console.log(playerStats.mp); // Should be reduced by 20
```

### 3. Test Save/Load
```typescript
// Save stats
localStorage.setItem('tutien2d_playerStats', JSON.stringify({
  currentHp: 100,
  mp: 50,
  maxHp: 100,
  maxMp: 50
}));

// Reload page
// Check stats restored correctly
console.log(useGameStore.getState().playerStats);
```

## Migration Steps

### For Existing Users

1. **Clear localStorage** (one-time):
```javascript
localStorage.removeItem('tutien2d_playerStats');
```

2. **Re-login** để lấy stats mới từ database

3. **Verify** MP hiển thị đúng trong UI

### For Developers

1. **Update all references** từ `currentMana`/`maxMana` sang `mp`/`maxMp`
2. **Test thoroughly** tất cả combat features
3. **Check database** có đúng trường `mp` và `max_mp`
4. **Update API docs** nếu có

## Backward Compatibility

Code hiện tại hỗ trợ đọc cả format cũ và mới:

```typescript
// lib/store.ts - Restore from localStorage
mp: stats.mp || stats.currentMana,        // Try new format first, fallback to old
maxMp: stats.maxMp || stats.maxMana,      // Try new format first, fallback to old
```

Điều này đảm bảo users cũ không bị lỗi khi update code.

## Common Issues

### Issue 1: MP không hiển thị
**Cause:** localStorage còn format cũ
**Fix:** Clear localStorage và re-login

### Issue 2: MP không trừ khi dùng skill
**Cause:** Code vẫn dùng `currentMana`
**Fix:** Tìm và replace tất cả `currentMana` → `mp`

### Issue 3: Database error "Unknown column 'mana'"
**Cause:** Code đang query trường `mana` thay vì `mp`
**Fix:** Sửa query để dùng `mp` và `max_mp`

## Summary

| Old Name | New Name | Database Column |
|----------|----------|-----------------|
| `currentMana` | `mp` | `mp` |
| `maxMana` | `maxMp` | `max_mp` |
| `currentHp` | `currentHp` | `hp` |
| `maxHp` | `maxHp` | `max_hp` |

**Key Point:** Luôn dùng tên trường khớp với database để tránh confusion!
