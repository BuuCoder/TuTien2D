# Migration Guide - HP/Mana Security Update

## Tổng quan

Hệ thống đã được cập nhật để ngăn chặn việc client gửi HP/Mana giả. Bạn cần cập nhật code để sử dụng các API mới.

## Thay đổi chính

### ❌ KHÔNG CÒN HOẠT ĐỘNG

```javascript
// Cập nhật HP/MP trực tiếp qua update-stats
await fetch('/api/player/update-stats', {
  body: JSON.stringify({ 
    currentHp: newHp, 
    currentMana: newMp 
  })
});
```

### ✅ SỬ DỤNG MỚI

```javascript
import { healPlayer, useSkill, takeDamage, getPlayerStats } from '@/lib/playerStatsAPI';

// 1. Lấy stats từ database
const { stats } = await getPlayerStats({ userId, sessionId, token });

// 2. Hồi phục HP
const result = await healPlayer({ userId, sessionId, token }, 'heal');
if (result.success) {
  setPlayerStats({ ...playerStats, hp: result.hp, mp: result.mp });
}

// 3. Sử dụng skill tấn công
const result = await useSkill({ userId, sessionId, token }, 'fireball', 'player');
if (result.success) {
  setPlayerStats({ ...playerStats, mp: result.mp });
  // Gửi damage qua socket
  socket.emit('use_skill', { skillId: 'fireball', damage: result.damage });
}

// 4. Nhận damage
const result = await takeDamage({ userId, sessionId, token }, attackerId, 'fireball');
if (result.success) {
  setPlayerStats({ ...playerStats, hp: result.hp });
  if (result.isDead) handleDeath();
}
```

## Các file cần cập nhật

1. **components/CombatManager.tsx** - Sử dụng API mới cho combat
2. **components/UI.tsx** - Sử dụng API mới cho healing
3. **components/Player.tsx** - Sync HP/Mana từ server
4. **components/AutoSaveStats.tsx** - Chỉ save gold/items, không save HP/MP

## API Endpoints mới

- `POST /api/player/get-stats` - Lấy HP/Mana từ database
- `POST /api/player/heal` - Hồi phục HP
- `POST /api/player/use-skill` - Sử dụng skill (validate MP)
- `POST /api/player/take-damage` - Nhận damage (validate HP)
- `POST /api/player/update-stats` - Chỉ cập nhật gold/items

## Xem thêm

- [API_SECURITY.md](./API_SECURITY.md) - Chi tiết về các API và cách sử dụng
- [lib/playerStatsAPI.ts](../lib/playerStatsAPI.ts) - Helper functions
