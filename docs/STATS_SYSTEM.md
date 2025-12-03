# Hệ thống Stats - HP/MP System

## Tổng quan

Hệ thống quản lý HP và MP được chia thành 2 loại:
1. **Current Stats** (HP/MP hiện tại) - Thay đổi thường xuyên
2. **Max Stats** (HP/MP tối đa) - Chỉ thay đổi khi có sự kiện đặc biệt

## Bảng so sánh

| Loại | Current HP/MP | Max HP/MP |
|------|---------------|-----------|
| **Mô tả** | Chỉ số hiện tại của người chơi | Giới hạn tối đa của chỉ số |
| **Thay đổi khi** | Combat, healing, skill usage | Level up, equipment, buff |
| **Tần suất** | Rất thường xuyên | Hiếm khi |
| **API sử dụng** | `heal`, `use-skill`, `take-damage` | `update-max-stats` |
| **Giới hạn** | 0 ≤ current ≤ max | 1 ≤ max ≤ 10000 |
| **Client có thể tự update?** | ❌ KHÔNG | ❌ KHÔNG |

## Current HP/MP (Chỉ số hiện tại)

### Đặc điểm
- Thay đổi liên tục trong gameplay
- Không bao giờ vượt quá Max HP/MP
- Không bao giờ âm (tối thiểu = 0)
- Khi = 0 → người chơi chết

### Các thao tác ảnh hưởng

#### Tăng Current HP
- ✅ Sử dụng skill hồi phục (`/api/player/heal`)
- ✅ Sử dụng item hồi phục
- ✅ Respawn sau khi chết
- ✅ Rest/regeneration (nếu có)

#### Giảm Current HP
- ✅ Nhận damage từ monster (`/api/player/take-damage`)
- ✅ Nhận damage từ player PK (`/api/player/take-damage`)
- ✅ Damage từ môi trường (poison, trap, etc.)

#### Tăng Current MP
- ✅ Sử dụng item hồi phục MP
- ✅ Regeneration theo thời gian
- ✅ Rest

#### Giảm Current MP
- ✅ Sử dụng skill (`/api/player/use-skill`)
- ✅ Cast spell

### Code Example

```typescript
import { healPlayer, useSkill, takeDamage } from '@/lib/playerStatsAPI';

// Hồi phục HP (tốn MP)
const result = await healPlayer(auth, 'heal');
// Current HP tăng, Current MP giảm

// Sử dụng skill tấn công (tốn MP)
const result = await useSkill(auth, 'fireball');
// Current MP giảm

// Nhận damage
const result = await takeDamage(auth, attackerId, 'slash');
// Current HP giảm
```

---

## Max HP/MP (Chỉ số tối đa)

### Đặc điểm
- Chỉ thay đổi khi có sự kiện đặc biệt
- Quyết định giới hạn của Current HP/MP
- Cần có lý do rõ ràng khi thay đổi (audit trail)

### Các thao tác ảnh hưởng

#### Tăng Max HP/MP
- ✅ Level up (`reason: 'level_up'`)
- ✅ Trang bị item có bonus max stats (`reason: 'equipment'`)
- ✅ Buff tạm thời (`reason: 'buff'`)
- ✅ Học skill passive (`reason: 'skill'`)
- ✅ Admin adjustment (`reason: 'admin'`)

#### Giảm Max HP/MP
- ✅ Gỡ trang bị (`reason: 'equipment'`)
- ✅ Buff hết hạn (`reason: 'buff'`)
- ✅ Debuff (`reason: 'buff'`)

### Công thức tính Max Stats

#### Level Up
```typescript
// Ví dụ công thức
const calculateMaxStats = (level: number) => {
  const maxHp = 100 + (level - 1) * 20;  // Base 100, +20 mỗi level
  const maxMp = 50 + (level - 1) * 10;   // Base 50, +10 mỗi level
  return { maxHp, maxMp };
};

// Level 1: 100 HP, 50 MP
// Level 2: 120 HP, 60 MP
// Level 5: 180 HP, 90 MP
// Level 10: 280 HP, 140 MP
```

#### Equipment Bonus
```typescript
// Item có thuộc tính bonus
interface Item {
  id: number;
  name: string;
  bonusMaxHp?: number;  // +max HP
  bonusMaxMp?: number;  // +max MP
}

// Ví dụ
const helmet = {
  id: 1,
  name: "Iron Helmet",
  bonusMaxHp: 20  // +20 max HP
};

const ring = {
  id: 2,
  name: "Mana Ring",
  bonusMaxMp: 15  // +15 max MP
};
```

### Code Example

```typescript
import { updateMaxStats } from '@/lib/playerStatsAPI';

// Level up
const handleLevelUp = async (newLevel: number) => {
  const { maxHp, maxMp } = calculateMaxStats(newLevel);
  
  await updateMaxStats(
    auth,
    maxHp,
    maxMp,
    'level_up'
  );
};

// Trang bị item
const handleEquipItem = async (item: Item) => {
  const newMaxHp = currentMaxHp + (item.bonusMaxHp || 0);
  const newMaxMp = currentMaxMp + (item.bonusMaxMp || 0);
  
  await updateMaxStats(
    auth,
    newMaxHp,
    newMaxMp,
    'equipment'
  );
};

// Buff tạm thời
const handleBuff = async (buffMaxHp: number, buffMaxMp: number) => {
  const newMaxHp = currentMaxHp + buffMaxHp;
  const newMaxMp = currentMaxMp + buffMaxMp;
  
  await updateMaxStats(
    auth,
    newMaxHp,
    newMaxMp,
    'buff'
  );
  
  // Sau khi buff hết hạn
  setTimeout(async () => {
    await updateMaxStats(
      auth,
      currentMaxHp,  // Trở về max cũ
      currentMaxMp,
      'buff'
    );
  }, buffDuration);
};
```

---

## Flow hoàn chỉnh

### 1. Đăng nhập
```typescript
// Login API trả về stats ban đầu
const { stats } = await login(username, password);
// stats = { hp: 100, max_hp: 100, mp: 50, max_mp: 50, level: 1 }

setPlayerStats(stats);
```

### 2. Combat (Giảm Current HP/MP)
```typescript
// Sử dụng skill (giảm current MP)
const skillResult = await useSkill(auth, 'fireball');
setPlayerStats({ ...stats, mp: skillResult.mp });

// Nhận damage (giảm current HP)
const damageResult = await takeDamage(auth, attackerId, 'slash');
setPlayerStats({ ...stats, hp: damageResult.hp });

if (damageResult.isDead) {
  handleDeath();
}
```

### 3. Healing (Tăng Current HP)
```typescript
// Hồi phục HP (giảm current MP)
const healResult = await healPlayer(auth, 'heal');
setPlayerStats({ 
  ...stats, 
  hp: healResult.hp,
  mp: healResult.mp 
});
```

### 4. Level Up (Tăng Max HP/MP)
```typescript
// Tăng experience
const newExp = currentExp + gainedExp;

if (newExp >= expToNextLevel) {
  const newLevel = currentLevel + 1;
  const { maxHp, maxMp } = calculateMaxStats(newLevel);
  
  // Cập nhật max stats
  const result = await updateMaxStats(auth, maxHp, maxMp, 'level_up');
  
  // Full heal sau khi level up
  await healPlayer(auth, 'full-heal');
  
  setPlayerStats({
    ...stats,
    level: newLevel,
    experience: newExp - expToNextLevel,
    maxHp: result.stats.max_hp,
    maxMp: result.stats.max_mp,
    hp: result.stats.max_hp,  // Full HP
    mp: result.stats.max_mp   // Full MP
  });
}
```

### 5. Equipment (Thay đổi Max HP/MP)
```typescript
// Trang bị item
const handleEquip = async (item: Item) => {
  const bonusHp = item.bonusMaxHp || 0;
  const bonusMp = item.bonusMaxMp || 0;
  
  if (bonusHp > 0 || bonusMp > 0) {
    const result = await updateMaxStats(
      auth,
      currentMaxHp + bonusHp,
      currentMaxMp + bonusMp,
      'equipment'
    );
    
    setPlayerStats({
      ...stats,
      maxHp: result.stats.max_hp,
      maxMp: result.stats.max_mp,
      hp: result.stats.hp,
      mp: result.stats.mp
    });
  }
  
  // Thêm item vào inventory
  await updateInventory(auth, undefined, [...items, item]);
};

// Gỡ trang bị
const handleUnequip = async (item: Item) => {
  const bonusHp = item.bonusMaxHp || 0;
  const bonusMp = item.bonusMaxMp || 0;
  
  if (bonusHp > 0 || bonusMp > 0) {
    const result = await updateMaxStats(
      auth,
      currentMaxHp - bonusHp,
      currentMaxMp - bonusMp,
      'equipment'
    );
    
    setPlayerStats({
      ...stats,
      maxHp: result.stats.max_hp,
      maxMp: result.stats.max_mp,
      hp: result.stats.hp,  // Tự động điều chỉnh nếu > max mới
      mp: result.stats.mp
    });
  }
  
  // Xóa item khỏi inventory
  await updateInventory(auth, undefined, items.filter(i => i.id !== item.id));
};
```

---

## Validation Rules

### Current HP/MP
- ✅ `0 ≤ current HP ≤ max HP`
- ✅ `0 ≤ current MP ≤ max MP`
- ✅ Khi current HP = 0 → player dies
- ✅ Không thể heal vượt quá max HP
- ✅ Không thể restore MP vượt quá max MP

### Max HP/MP
- ✅ `1 ≤ max HP ≤ 10000`
- ✅ `1 ≤ max MP ≤ 10000`
- ✅ Phải có reason hợp lệ khi update
- ✅ Tự động điều chỉnh current nếu > max mới

### Security
- ✅ Mọi thao tác đều cần JWT token
- ✅ Validate từ database trước khi xử lý
- ✅ Client không thể tự update stats
- ✅ Log mọi thay đổi để audit

---

## Best Practices

### DO ✅
- Luôn lấy stats từ database trước khi xử lý
- Validate token cho mọi API call
- Log reason khi update max stats
- Sync stats sau khi reconnect
- Handle edge cases (HP = 0, MP không đủ)

### DON'T ❌
- Không tin tưởng stats từ client
- Không cho phép client tự update HP/MP
- Không skip validation
- Không update max stats không có reason
- Không quên check MP cost trước khi use skill

---

## Troubleshooting

### Current HP/MP không đồng bộ
```typescript
// Sync lại từ server
const { stats } = await getPlayerStats(auth);
setPlayerStats(stats);
```

### Max HP/MP không cập nhật sau level up
```typescript
// Kiểm tra reason có hợp lệ không
// Kiểm tra token có đúng không
// Kiểm tra database có cập nhật không
```

### HP vượt quá max HP
```typescript
// Server tự động điều chỉnh khi update max stats
// Nếu vẫn sai, sync lại từ server
```

---

## Database Schema

```sql
CREATE TABLE user_stats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    level INT DEFAULT 1,
    experience INT DEFAULT 0,
    hp INT DEFAULT 100,           -- Current HP
    max_hp INT DEFAULT 100,       -- Max HP
    mp INT DEFAULT 50,            -- Current MP
    max_mp INT DEFAULT 50,        -- Max MP
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

---

## Summary

| Action | API | Ảnh hưởng |
|--------|-----|-----------|
| Hồi phục HP | `/api/player/heal` | Current HP ↑, Current MP ↓ |
| Sử dụng skill | `/api/player/use-skill` | Current MP ↓ |
| Nhận damage | `/api/player/take-damage` | Current HP ↓ |
| Level up | `/api/player/update-max-stats` | Max HP ↑, Max MP ↑ |
| Trang bị | `/api/player/update-max-stats` | Max HP ↑/↓, Max MP ↑/↓ |
| Buff | `/api/player/update-max-stats` | Max HP ↑/↓, Max MP ↑/↓ |
| Sync stats | `/api/player/get-stats` | Lấy tất cả stats từ DB |
