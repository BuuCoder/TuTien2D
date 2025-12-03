# Security Update - HP/Mana Validation

## Ngày cập nhật: 2025-12-03

## Vấn đề

Trước đây, hệ thống tin tưởng hoàn toàn vào HP/Mana được gửi từ client, dẫn đến các lỗ hổng bảo mật:
- Client có thể gửi HP/Mana giả để không bao giờ chết
- Client có thể gửi MP giả để sử dụng skill không giới hạn
- Không có validation cho damage và healing
- API `update-stats` cho phép cập nhật HP/MP tùy ý

## Giải pháp

### 1. API Endpoints mới

Tạo các API chuyên dụng với validation server-side:

#### `POST /api/auth/logout`
- Đăng xuất người chơi
- Clear active session trong database
- Cho phép logout ngay cả khi token expired

#### `POST /api/player/get-stats`
- Lấy HP/Mana thực tế từ database
- Sử dụng sau khi login, respawn, hoặc cần sync

#### `POST /api/player/heal`
- Xử lý skill hồi phục HP (current HP)
- Validate MP cost
- Tính toán HP mới (không vượt quá max_hp)
- Cập nhật database

#### `POST /api/player/use-skill`
- Xử lý skill tấn công
- Validate MP cost
- Trả về damage chính xác từ server
- Trừ MP (current MP)
- Cập nhật database

#### `POST /api/player/take-damage`
- Xử lý khi nhận damage
- Validate attacker và victim token
- Tính damage dựa trên skillId (server-side)
- Trừ HP (current HP) và kiểm tra chết/sống
- Cập nhật database

#### `POST /api/player/update-max-stats`
- Cập nhật Max HP và Max MP
- CHỈ sử dụng khi: level up, trang bị, buff, skill đặc biệt
- Validate reason (level_up, equipment, buff, skill, admin)
- Tự động điều chỉnh current HP/MP nếu vượt quá max mới
- Log để audit trail

### 2. Cập nhật API cũ

#### `POST /api/player/update-stats`
- **KHÔNG CÒN** cho phép cập nhật HP/MP (current hoặc max)
- Chỉ cho phép cập nhật gold và items
- Current HP/MP chỉ được cập nhật qua: `heal`, `use-skill`, `take-damage`
- Max HP/MP chỉ được cập nhật qua: `update-max-stats`

### 3. Helper Library

Tạo `lib/playerStatsAPI.ts` với các hàm helper:
- `getPlayerStats()` - Lấy stats từ database
- `healPlayer()` - Hồi phục HP
- `useSkill()` - Sử dụng skill tấn công
- `takeDamage()` - Nhận damage
- `updateInventory()` - Cập nhật gold/items
- `hasEnoughMP()` - Kiểm tra MP (client-side)
- `getSkillInfo()` - Lấy thông tin skill

### 4. Documentation

- `docs/API_SECURITY.md` - Chi tiết về API và cách sử dụng
- `docs/MIGRATION_GUIDE.md` - Hướng dẫn migration từ code cũ
- `CHANGELOG_SECURITY.md` - File này

## Files đã thay đổi

### Mới
- `app/api/auth/logout/route.js` - API đăng xuất
- `app/api/player/get-stats/route.js` - Lấy stats từ DB
- `app/api/player/heal/route.js` - Hồi phục current HP
- `app/api/player/use-skill/route.js` - Sử dụng skill (trừ current MP)
- `app/api/player/take-damage/route.js` - Nhận damage (trừ current HP)
- `app/api/player/update-max-stats/route.js` - Cập nhật max HP/MP
- `lib/playerStatsAPI.ts` - Helper functions (bao gồm logout)
- `docs/API_SECURITY.md` - Documentation chi tiết
- `docs/MIGRATION_GUIDE.md` - Hướng dẫn migration
- `docs/STATS_SYSTEM.md` - Hệ thống stats chi tiết
- `CHANGELOG_SECURITY.md` - File này

### Đã sửa
- `app/api/player/update-stats/route.js` - Loại bỏ khả năng cập nhật HP/MP
- `components/UI.tsx` - Thêm nút đăng xuất và user info
- `components/CombatUI.tsx` - Hiển thị thanh combat luôn ở dưới
- `README.md` - Thêm thông tin về security update

### Cần cập nhật (TODO)
- `components/CombatManager.tsx` - Sử dụng API mới
- `components/UI.tsx` - Sử dụng API mới cho healing
- `components/Player.tsx` - Sync HP/Mana từ server
- `components/AutoSaveStats.tsx` - Chỉ save gold/items

## Cách sử dụng

### 1. Import helper
```typescript
import { healPlayer, useSkill, takeDamage, getPlayerStats } from '@/lib/playerStatsAPI';
```

### 2. Lấy stats sau khi login
```typescript
const { stats } = await getPlayerStats({ userId, sessionId, token });
setPlayerStats(stats);
```

### 3. Hồi phục HP
```typescript
const result = await healPlayer({ userId, sessionId, token }, 'heal');
if (result.success) {
  setPlayerStats({ ...playerStats, hp: result.hp, mp: result.mp });
}
```

### 4. Sử dụng skill tấn công
```typescript
const result = await useSkill({ userId, sessionId, token }, 'fireball');
if (result.success) {
  setPlayerStats({ ...playerStats, mp: result.mp });
  socket.emit('use_skill', { skillId: 'fireball', damage: result.damage });
}
```

### 5. Nhận damage
```typescript
const result = await takeDamage({ userId, sessionId, token }, attackerId, 'fireball');
if (result.success) {
  setPlayerStats({ ...playerStats, hp: result.hp });
  if (result.isDead) handleDeath();
}
```

## Bảo mật

### ✅ Đã được bảo vệ
- HP/Mana giả từ client
- Damage giả
- MP cost giả
- Healing amount giả
- Unauthorized access (JWT token)

### ⚠️ Lưu ý
- Luôn validate token ở mọi API
- Không tin tưởng bất kỳ giá trị nào từ client
- Log mọi action để phát hiện hành vi bất thường
- Rate limiting đã được áp dụng

## Testing

Chạy test để đảm bảo API hoạt động đúng:

```bash
# Test heal API
curl -X POST http://localhost:4004/api/player/heal \
  -H "Content-Type: application/json" \
  -d '{"userId":1,"sessionId":"...","token":"...","skillId":"heal"}'

# Test use-skill API
curl -X POST http://localhost:4004/api/player/use-skill \
  -H "Content-Type: application/json" \
  -d '{"userId":1,"sessionId":"...","token":"...","skillId":"fireball"}'

# Test take-damage API
curl -X POST http://localhost:4004/api/player/take-damage \
  -H "Content-Type: application/json" \
  -d '{"userId":1,"sessionId":"...","token":"...","attackerId":2,"skillId":"fireball"}'
```

## Rollback

Nếu cần rollback, restore các file sau:
- `app/api/player/update-stats/route.js` (version cũ)
- Xóa các API mới trong `app/api/player/`
- Xóa `lib/playerStatsAPI.ts`

## Next Steps

1. Cập nhật các component để sử dụng API mới
2. Test kỹ lưỡng các tình huống combat
3. Monitor logs để phát hiện hành vi bất thường
4. Thêm rate limiting cho các API mới nếu cần
5. Cân nhắc thêm captcha cho các action quan trọng

## Contact

Nếu có vấn đề hoặc câu hỏi, vui lòng tạo issue hoặc liên hệ team.
