# Skill System Update

## Ngày cập nhật: 2025-12-03

## Thay đổi

### 1. Skill Hồi Phục (Heal)

**Trước:**
- ❌ Cần bật PK mode mới dùng được
- ❌ Không tiện khi chỉ muốn hồi máu

**Bây giờ:**
- ✅ Không cần PK mode
- ✅ Không cần target
- ✅ Dùng được bất cứ lúc nào
- ✅ Chỉ cần đủ MP

**Use case:**
- Hồi máu sau khi đánh quái
- Hồi máu trước khi vào combat
- Hồi máu khi đang khám phá map

---

### 2. Skill Tấn Công

**Trước:**
- ❌ Bắt buộc phải bật PK mode

**Bây giờ:**
- ✅ Cần PK mode HOẶC có quái gần đó
- ✅ Tự động tìm target (player PK hoặc monster)
- ✅ Ưu tiên target PK trước, sau đó mới đến monster

**Logic:**
```typescript
// Check if has any valid target
const hasPKTarget = activeSessions.length > 0;
const hasMonsterTarget = Array.from(monsters.values()).some(m => !m.isDead);

if (!hasPKTarget && !hasMonsterTarget) {
  // Không thể dùng skill
  setNotification({ 
    message: 'Không có mục tiêu! Bật PK mode hoặc tìm quái gần đó.', 
    type: 'error' 
  });
  return;
}
```

**Skills tấn công:**
- ⚔️ Basic Attack
- 🗡️ Slash
- ⚡ Charge
- 🔥 Fireball
- ❄️ Ice Spike
- ⚡ Holy Strike

---

### 3. Skill Block (Miễn Nhiễm)

**Trước:**
- ❌ Chỉ block trong 100ms (0.1s)
- ❌ Chỉ giảm damage xuống 1
- ❌ Rất khó timing
- ❌ Cần target

**Bây giờ:**
- ✅ Miễn nhiễm hoàn toàn trong 5 giây
- ✅ Không nhận damage từ player PK
- ✅ Không nhận damage từ monster
- ✅ Cooldown 10 giây
- ✅ Không cần target
- ✅ Không cần PK mode
- ✅ Dễ sử dụng hơn

**Thông số:**
```typescript
{
  id: 'block',
  name: 'Miễn Nhiễm',
  description: 'Miễn nhiễm mọi tấn công trong 5 giây',
  manaCost: 10,
  damage: 0,
  cooldown: 10000,  // 10s
  range: 0,
  castTime: 0,
  icon: '🛡️',
}
```

**Logic:**
```typescript
// XỬ LÝ BLOCK SKILL (không cần target)
if (skillId === 'block') {
  // Consume mana
  setPlayerStats({ mp: Math.max(0, playerStats.mp - skill.manaCost) });
  
  // Add cooldown
  addSkillCooldown(skillId, skill.cooldown);
  
  // Activate block for 5 seconds
  useGameStore.getState().setIsBlocking(true);
  useGameStore.getState().setBlockEndTime(Date.now() + 5000);
  
  setTimeout(() => {
    useGameStore.getState().setIsBlocking(false);
    setNotification({ message: '🛡️ Hết hiệu lực phòng thủ!', type: 'info' });
  }, 5000);
  
  setNotification({ message: '🛡️ Miễn nhiễm 5 giây!', type: 'success' });
  return; // Kết thúc sớm, không cần tìm target
}
```

**Khi nhận damage:**
```typescript
// Check if blocking - miễn nhiễm hoàn toàn
if (state.isBlocking) {
  setNotification({ message: '🛡️ Miễn nhiễm!', type: 'success' });
  addDamageIndicator(playerPosition.x, playerPosition.y, 0);
  return; // Không nhận damage
}
```

---

## Bảng so sánh

| Skill | Cần PK Mode? | Cần Target? | Đặc biệt |
|-------|--------------|-------------|----------|
| 💚 Heal | ❌ Không | ❌ Không | Hồi HP, trừ MP |
| 🛡️ Block | ❌ Không | ❌ Không | Miễn nhiễm 5s |
| ⚔️ Basic Attack | ⚠️ Hoặc có quái | ✅ Có | Tấn công |
| 🗡️ Slash | ⚠️ Hoặc có quái | ✅ Có | Tấn công |
| ⚡ Charge | ⚠️ Hoặc có quái | ✅ Có | Tấn công |
| 🔥 Fireball | ⚠️ Hoặc có quái | ✅ Có | Tấn công |
| ❄️ Ice Spike | ⚠️ Hoặc có quái | ✅ Có | Tấn công |
| ⚡ Holy Strike | ⚠️ Hoặc có quái | ✅ Có | Tấn công |

---

## Use Cases

### 1. Đánh quái (PvE)
```
1. Tìm quái
2. Đứng gần quái (trong range)
3. Dùng skill tấn công (không cần bật PK mode)
4. Quái chết → nhặt gold
5. Nếu máu thấp → dùng Heal
6. Nếu quái tấn công → dùng Block
```

### 2. PK với player
```
1. Gửi PK request
2. Đối phương chấp nhận
3. PK mode tự động bật
4. Dùng skill tấn công
5. Nếu bị tấn công → dùng Block (miễn nhiễm 5s)
6. Nếu máu thấp → dùng Heal
7. Chiến thắng hoặc thua → PK mode tự động tắt
```

### 3. Khám phá map
```
1. Di chuyển quanh map
2. Nếu máu thấp → dùng Heal (không cần PK mode)
3. Nếu gặp quái → tấn công (không cần PK mode)
4. Nếu bị quái tấn công → dùng Block
```

---

## Files Changed

### Components
- `components/CombatManager.tsx`
  - Sửa logic check PK mode cho skill
  - Sửa block duration từ 100ms → 5000ms
  - Sửa block effect từ giảm damage → miễn nhiễm hoàn toàn
  - Thêm check target cho skill tấn công

- `components/CombatUI.tsx`
  - Sửa check PK mode cho heal và block skill
  - Update error message

- `components/MonsterManager.tsx`
  - Thêm check blocking khi nhận damage từ monster
  - Miễn nhiễm hoàn toàn khi đang block

### Data
- `lib/skillData.ts`
  - Update block skill info
  - Tên: "Phòng Thủ" → "Miễn Nhiễm"
  - Description: "Chặn đòn tấn công (0.1s window)" → "Miễn nhiễm mọi tấn công trong 5 giây"
  - Cooldown: 3000ms → 10000ms

---

## Testing

### Test 1: Heal không cần PK mode
```
1. Đăng nhập vào game
2. Không bật PK mode
3. Click skill Heal
4. Expected: ✅ Heal thành công, HP tăng, MP giảm
```

### Test 2: Tấn công quái không cần PK mode
```
1. Đăng nhập vào game
2. Không bật PK mode
3. Đứng gần quái
4. Click skill tấn công (Fireball, Slash, etc.)
5. Expected: ✅ Skill được dùng, quái nhận damage
```

### Test 3: Block miễn nhiễm 5 giây
```
1. Đăng nhập vào game
2. Đứng gần quái
3. Click skill Block
4. Expected: ✅ Notification "Miễn nhiễm 5 giây!"
5. Quái tấn công
6. Expected: ✅ Không nhận damage, notification "Miễn nhiễm!"
7. Sau 5 giây
8. Expected: ✅ Notification "Hết hiệu lực phòng thủ!"
9. Quái tấn công lại
10. Expected: ✅ Nhận damage bình thường
```

### Test 4: Block trong PK
```
1. Gửi PK request và được chấp nhận
2. Dùng Block
3. Đối phương tấn công
4. Expected: ✅ Không nhận damage trong 5 giây
```

### Test 5: Skill tấn công không có target
```
1. Đăng nhập vào game
2. Không bật PK mode
3. Không có quái gần đó
4. Click skill tấn công
5. Expected: ❌ Error "Không có mục tiêu! Bật PK mode hoặc tìm quái gần đó."
```

---

## Balance Changes

### Block Skill
- **Duration:** 100ms → 5000ms (50x tăng)
- **Cooldown:** 3000ms → 10000ms (3.3x tăng)
- **Effect:** Giảm damage → Miễn nhiễm hoàn toàn
- **Uptime:** 5s active / 10s cooldown = 50% uptime (nếu spam)

**Reasoning:**
- 100ms quá ngắn, khó timing
- 5s đủ để thoát khỏi combat hoặc hồi máu
- 10s cooldown để tránh spam
- Miễn nhiễm hoàn toàn để skill có giá trị

---

## Future Improvements

### Skill System
- [ ] Thêm skill passive (tăng stats)
- [ ] Thêm skill buff/debuff
- [ ] Thêm skill AOE (area of effect)
- [ ] Thêm skill combo

### Block Skill
- [ ] Visual effect khi đang block
- [ ] Sound effect
- [ ] Particle effect khi block thành công
- [ ] Countdown timer hiển thị thời gian còn lại

### Heal Skill
- [ ] Heal over time (HoT)
- [ ] Group heal
- [ ] Heal + buff

---

## Summary

**Key Changes:**
1. ✅ Heal skill không cần PK mode
2. ✅ Skill tấn công có thể dùng với quái (không cần PK mode)
3. ✅ Block skill miễn nhiễm hoàn toàn trong 5 giây

**Benefits:**
- Dễ sử dụng hơn cho người chơi mới
- Linh hoạt hơn trong combat
- Block skill có giá trị thực tế
- PvE experience tốt hơn
