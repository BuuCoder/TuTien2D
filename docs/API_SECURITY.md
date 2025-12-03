# API Security - HP/Mana Validation

## Tổng quan

Hệ thống đã được cải thiện để ngăn chặn việc client gửi HP/Mana giả. Tất cả các thao tác liên quan đến HP/Mana đều được validate và xử lý ở server-side.

## Nguyên tắc bảo mật

1. **KHÔNG BAO GIỜ tin tưởng HP/Mana từ client**
2. **Luôn lấy HP/Mana từ database trước khi xử lý**
3. **Validate tất cả các action trước khi cập nhật**
4. **Sử dụng JWT token để xác thực mọi request**

## Phân biệt Current Stats vs Max Stats

### Current HP/MP (Chỉ số hiện tại)
- Thay đổi thường xuyên qua combat, healing, skill usage
- Được cập nhật qua: `heal`, `use-skill`, `take-damage`
- Không bao giờ vượt quá Max HP/MP
- **KHÔNG được phép client tự cập nhật**

### Max HP/MP (Chỉ số tối đa)
- Chỉ thay đổi khi:
  - Level up
  - Trang bị item tăng stats
  - Buff/skill đặc biệt
- Được cập nhật qua: `update-max-stats`
- Cần có lý do rõ ràng (reason) khi cập nhật

---

## API Endpoints

### 1. GET Stats (Lấy thông tin HP/Mana)

**Endpoint:** `POST /api/player/get-stats`

**Mục đích:** Lấy HP/Mana thực tế từ database

**Request:**
```json
{
  "userId": 1,
  "sessionId": "abc123...",
  "token": "jwt_token_here"
}
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "hp": 85,
    "max_hp": 100,
    "mp": 30,
    "max_mp": 50,
    "level": 1,
    "experience": 0
  }
}
```

**Khi nào sử dụng:**
- Sau khi đăng nhập
- Sau khi respawn
- Khi cần sync lại HP/Mana với server

---

### 2. Heal (Hồi phục HP)

**Endpoint:** `POST /api/player/heal`

**Mục đích:** Sử dụng skill hồi phục HP, server tự tính toán và validate

**Request:**
```json
{
  "userId": 1,
  "sessionId": "abc123...",
  "token": "jwt_token_here",
  "skillId": "heal"
}
```

**Healing Skills:**
- `heal`: +50 HP, -20 MP
- `greater-heal`: +100 HP, -40 MP
- `full-heal`: Full HP, -80 MP

**Response (Success):**
```json
{
  "success": true,
  "hp": 100,
  "maxHp": 100,
  "mp": 30,
  "maxMp": 50,
  "healed": 50
}
```

**Response (Not enough MP):**
```json
{
  "error": "Không đủ MP để sử dụng skill này",
  "currentMp": 10
}
```

**Validation:**
- ✅ Kiểm tra MP đủ không
- ✅ Lấy HP hiện tại từ database
- ✅ Tính toán HP mới (không vượt quá max_hp)
- ✅ Trừ MP cost
- ✅ Cập nhật database

---

### 3. Use Skill (Sử dụng skill tấn công)

**Endpoint:** `POST /api/player/use-skill`

**Mục đích:** Sử dụng skill tấn công, server validate MP và trả về damage

**Request:**
```json
{
  "userId": 1,
  "sessionId": "abc123...",
  "token": "jwt_token_here",
  "skillId": "fireball",
  "targetType": "monster" // hoặc "player"
}
```

**Skills:**
- `basic-attack`: 10 damage, 0 MP
- `slash`: 25 damage, -10 MP
- `charge`: 35 damage, -15 MP
- `fireball`: 40 damage, -20 MP
- `ice-spike`: 45 damage, -25 MP
- `holy-strike`: 50 damage, -30 MP
- `block`: 0 damage, -5 MP

**Response:**
```json
{
  "success": true,
  "mp": 30,
  "maxMp": 50,
  "damage": 40,
  "mpCost": 20
}
```

**Validation:**
- ✅ Kiểm tra MP đủ không
- ✅ Trừ MP cost
- ✅ Trả về damage chính xác (server-side)
- ✅ Cập nhật database

---

### 4. Take Damage (Nhận sát thương)

**Endpoint:** `POST /api/player/take-damage`

**Mục đích:** Xử lý khi nhận damage, server tự tính toán HP mới

**Request:**
```json
{
  "userId": 1,
  "sessionId": "abc123...",
  "token": "jwt_token_here",
  "attackerId": 2,
  "skillId": "fireball",
  "attackerToken": "attacker_jwt_token" // Optional, để validate attacker
}
```

**Response:**
```json
{
  "success": true,
  "hp": 60,
  "maxHp": 100,
  "damage": 40,
  "isDead": false
}
```

**Validation:**
- ✅ Validate victim token
- ✅ Validate attacker token (nếu có)
- ✅ Lấy HP hiện tại từ database
- ✅ Tính damage dựa trên skillId (server-side)
- ✅ Tính HP mới (không âm)
- ✅ Cập nhật database
- ✅ Trả về trạng thái chết/sống

---

### 5. Update Stats (Cập nhật inventory)

**Endpoint:** `POST /api/player/update-stats`

**Mục đích:** Chỉ cập nhật gold và items, KHÔNG cho phép cập nhật HP/MP

**Request:**
```json
{
  "userId": 1,
  "sessionId": "abc123...",
  "token": "jwt_token_here",
  "gold": 1500,
  "items": [{"id": 1, "name": "Potion"}]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Stats updated"
}
```

**Lưu ý:**
- ❌ KHÔNG cho phép cập nhật HP/MP (current hoặc max)
- ✅ Chỉ cập nhật gold và items

---

### 6. Update Max Stats (Cập nhật Max HP/MP)

**Endpoint:** `POST /api/player/update-max-stats`

**Mục đích:** Cập nhật Max HP và Max MP khi có thay đổi đặc biệt

**Request:**
```json
{
  "userId": 1,
  "sessionId": "abc123...",
  "token": "jwt_token_here",
  "maxHp": 150,
  "maxMp": 80,
  "reason": "level_up"
}
```

**Valid Reasons:**
- `level_up` - Khi người chơi lên level
- `equipment` - Khi trang bị item tăng max stats
- `buff` - Khi có buff tăng max stats
- `skill` - Khi học skill tăng max stats
- `admin` - Admin adjustment

**Response:**
```json
{
  "success": true,
  "stats": {
    "hp": 100,
    "max_hp": 150,
    "mp": 50,
    "max_mp": 80
  },
  "message": "Max stats updated (level_up)"
}
```

**Validation:**
- ✅ Kiểm tra reason hợp lệ
- ✅ Validate max HP/MP trong khoảng 1-10000
- ✅ Tự động điều chỉnh current HP/MP nếu vượt quá max mới
- ✅ Log lý do cập nhật để audit

**Khi nào sử dụng:**
- Khi người chơi lên level (tăng max HP/MP theo công thức)
- Khi trang bị item có thuộc tính +max HP/MP
- Khi có buff tạm thời tăng max stats
- Khi học skill passive tăng max stats

**Lưu ý:**
- ⚠️ API này KHÔNG cập nhật current HP/MP
- ⚠️ Nếu current HP > max HP mới, current HP sẽ được điều chỉnh = max HP
- ⚠️ Cần có reason rõ ràng để audit trail

---

## Flow sử dụng

### 1. Sau khi đăng nhập

```javascript
// Login API đã trả về stats ban đầu
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({ username, password })
});

const { stats, socketToken, sessionId } = await loginResponse.json();
// stats = { hp: 100, max_hp: 100, mp: 50, max_mp: 50, ... }

// Lưu vào state
setPlayerStats(stats);
```

### 2. Khi sử dụng skill hồi phục

```javascript
const handleHeal = async () => {
  try {
    const response = await fetch('/api/player/heal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: player.id,
        sessionId: player.sessionId,
        token: player.socketToken,
        skillId: 'heal'
      })
    });

    const data = await response.json();
    
    if (data.success) {
      // Cập nhật UI với HP/MP mới từ server
      setPlayerStats({
        ...playerStats,
        hp: data.hp,
        mp: data.mp
      });
      
      console.log(`Hồi phục ${data.healed} HP`);
    } else {
      console.error(data.error);
    }
  } catch (error) {
    console.error('Heal failed:', error);
  }
};
```

### 3. Khi sử dụng skill tấn công

```javascript
const handleAttack = async (skillId, targetId) => {
  try {
    // Bước 1: Validate và trừ MP ở server
    const response = await fetch('/api/player/use-skill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: player.id,
        sessionId: player.sessionId,
        token: player.socketToken,
        skillId: skillId,
        targetType: 'player'
      })
    });

    const data = await response.json();
    
    if (!data.success) {
      console.error(data.error);
      return;
    }

    // Bước 2: Cập nhật MP của mình
    setPlayerStats({
      ...playerStats,
      mp: data.mp
    });

    // Bước 3: Gửi damage đến target qua socket
    socket.emit('use_skill', {
      skillId: skillId,
      targetId: targetId,
      damage: data.damage, // Damage từ server
      isPK: true
    });

  } catch (error) {
    console.error('Attack failed:', error);
  }
};
```

### 4. Khi nhận damage (PK hoặc Monster)

```javascript
// Lắng nghe event từ socket
socket.on('player_damaged', async ({ damage, attackerId, skillId }) => {
  try {
    // Gọi API để server tính toán HP mới
    const response = await fetch('/api/player/take-damage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: player.id,
        sessionId: player.sessionId,
        token: player.socketToken,
        attackerId: attackerId,
        skillId: skillId
      })
    });

    const data = await response.json();
    
    if (data.success) {
      // Cập nhật HP từ server
      setPlayerStats({
        ...playerStats,
        hp: data.hp
      });

      // Hiển thị damage indicator
      showDamageIndicator(data.damage);

      // Kiểm tra chết
      if (data.isDead) {
        handlePlayerDeath();
      }
    }
  } catch (error) {
    console.error('Take damage failed:', error);
  }
});
```

### 5. Sync lại HP/Mana khi cần

```javascript
const syncStats = async () => {
  try {
    const response = await fetch('/api/player/get-stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: player.id,
        sessionId: player.sessionId,
        token: player.socketToken
      })
    });

    const data = await response.json();
    
    if (data.success) {
      setPlayerStats(data.stats);
    }
  } catch (error) {
    console.error('Sync stats failed:', error);
  }
};

// Gọi khi:
// - Sau khi respawn
// - Sau khi reconnect
// - Khi nghi ngờ HP/Mana không đồng bộ
```

### 6. Level Up (Tăng Max HP/MP)

```javascript
const handleLevelUp = async (newLevel) => {
  try {
    // Tính toán max HP/MP mới dựa trên level
    const newMaxHp = 100 + (newLevel - 1) * 20; // +20 HP mỗi level
    const newMaxMp = 50 + (newLevel - 1) * 10;  // +10 MP mỗi level

    // Cập nhật max stats
    const response = await fetch('/api/player/update-max-stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: player.id,
        sessionId: player.sessionId,
        token: player.socketToken,
        maxHp: newMaxHp,
        maxMp: newMaxMp,
        reason: 'level_up'
      })
    });

    const data = await response.json();
    
    if (data.success) {
      // Cập nhật stats với max mới
      setPlayerStats({
        ...playerStats,
        level: newLevel,
        maxHp: data.stats.max_hp,
        maxMp: data.stats.max_mp,
        hp: data.stats.hp,
        mp: data.stats.mp
      });

      // Có thể full heal sau khi level up
      await healToFull();
    }
  } catch (error) {
    console.error('Level up failed:', error);
  }
};
```

### 7. Trang bị item tăng Max Stats

```javascript
const handleEquipItem = async (item) => {
  try {
    // Item có thuộc tính +max HP/MP
    const bonusMaxHp = item.bonusMaxHp || 0;
    const bonusMaxMp = item.bonusMaxMp || 0;

    if (bonusMaxHp > 0 || bonusMaxMp > 0) {
      // Tính toán max stats mới
      const newMaxHp = playerStats.maxHp + bonusMaxHp;
      const newMaxMp = playerStats.maxMp + bonusMaxMp;

      // Cập nhật max stats
      const response = await fetch('/api/player/update-max-stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: player.id,
          sessionId: player.sessionId,
          token: player.socketToken,
          maxHp: newMaxHp,
          maxMp: newMaxMp,
          reason: 'equipment'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setPlayerStats({
          ...playerStats,
          maxHp: data.stats.max_hp,
          maxMp: data.stats.max_mp,
          hp: data.stats.hp,
          mp: data.stats.mp
        });

        console.log(`Equipped ${item.name}: +${bonusMaxHp} Max HP, +${bonusMaxMp} Max MP`);
      }
    }

    // Cập nhật inventory
    await updateInventory(player, undefined, [...playerStats.items, item]);
  } catch (error) {
    console.error('Equip item failed:', error);
  }
};
```

---

## Bảo mật

### ✅ Đã được bảo vệ

1. **HP/Mana giả:** Client không thể gửi HP/Mana tùy ý
2. **Damage giả:** Damage được tính toán ở server dựa trên skillId
3. **MP cost giả:** MP cost được validate ở server
4. **Healing giả:** Healing amount được tính toán ở server
5. **Token validation:** Mọi request đều cần JWT token hợp lệ

### ⚠️ Lưu ý

1. **Luôn sử dụng API mới** cho mọi thao tác liên quan đến HP/Mana
2. **Không tin tưởng HP/Mana từ client** khi xử lý combat
3. **Validate token** ở mọi API endpoint
4. **Log mọi action** để phát hiện hành vi bất thường

---

## Migration từ code cũ

### Trước đây (KHÔNG AN TOÀN):
```javascript
// ❌ Client tự trừ HP
setPlayerStats({ ...playerStats, hp: playerStats.hp - damage });

// ❌ Client tự cộng HP
setPlayerStats({ ...playerStats, hp: playerStats.hp + 50 });

// ❌ Gửi HP lên server
await fetch('/api/player/update-stats', {
  body: JSON.stringify({ currentHp: newHp, currentMana: newMp })
});
```

### Bây giờ (AN TOÀN):
```javascript
// ✅ Gọi API, server tự tính toán
const response = await fetch('/api/player/heal', {
  body: JSON.stringify({ userId, sessionId, token, skillId: 'heal' })
});
const { hp, mp } = await response.json();
setPlayerStats({ ...playerStats, hp, mp });

// ✅ Gọi API, server tự trừ HP
const response = await fetch('/api/player/take-damage', {
  body: JSON.stringify({ userId, sessionId, token, attackerId, skillId })
});
const { hp, isDead } = await response.json();
setPlayerStats({ ...playerStats, hp });
```

---

## Testing

### Test case 1: Không đủ MP
```bash
# Request với MP không đủ
curl -X POST http://localhost:4004/api/player/heal \
  -H "Content-Type: application/json" \
  -d '{"userId":1,"sessionId":"...","token":"...","skillId":"heal"}'

# Expected: {"error": "Không đủ MP để sử dụng skill này", "currentMp": 10}
```

### Test case 2: Token không hợp lệ
```bash
# Request với token sai
curl -X POST http://localhost:4004/api/player/heal \
  -H "Content-Type: application/json" \
  -d '{"userId":1,"sessionId":"...","token":"invalid_token","skillId":"heal"}'

# Expected: {"error": "Token không hợp lệ: ..."}
```

### Test case 3: Damage validation
```bash
# Request với skillId không tồn tại
curl -X POST http://localhost:4004/api/player/take-damage \
  -H "Content-Type: application/json" \
  -d '{"userId":1,"sessionId":"...","token":"...","attackerId":2,"skillId":"fake-skill"}'

# Expected: Damage = 10 (default)
```
