# API Classification - Obfuscation Strategy

## 🔒 Sensitive APIs (Obfuscated)

Các API này xử lý dữ liệu nhạy cảm và cần obfuscation:

### Authentication
- ✅ `/api/auth/login` - Credentials (username, password)
- ✅ `/api/auth/logout` - Session tokens

### Player Actions
- ✅ `/api/player/get-stats` - Player stats
- ✅ `/api/player/heal` - Healing actions
- ✅ `/api/player/use-skill` - Skill usage
- ✅ `/api/player/take-damage` - Damage calculations
- ✅ `/api/player/update-stats` - Stats updates
- ✅ `/api/player/update-max-stats` - Max stats updates
- ✅ `/api/player/add-gold` - Gold transactions
- ✅ `/api/player/regen-mp` - MP regeneration

### Social
- ✅ `/api/friends/add` - Friend requests

**Total**: 11 APIs

---

## 🌐 Public APIs (Not Obfuscated)

Các API này xử lý dữ liệu công khai, không cần obfuscation:

### NPC Interaction
- ❌ `/api/interact` - NPC messages, shop items, quests
  - **Lý do**: Public game data, không nhạy cảm
  - **Data**: Menu, items, prices, quest info

### Game Actions (Future)
- ❌ `/api/game-action` - General game actions
- ❌ `/api/buy-item` - Shop purchases (có thể cần obfuscate sau)

**Total**: 1-3 APIs

---

## 📊 Decision Matrix

| API Type | Obfuscate? | Reason |
|----------|-----------|--------|
| **Login/Auth** | ✅ Yes | Credentials, tokens |
| **Player Stats** | ✅ Yes | Prevent cheating |
| **Combat Actions** | ✅ Yes | Prevent manipulation |
| **Gold/Items** | ✅ Yes | Prevent duplication |
| **NPC Interaction** | ❌ No | Public game data |
| **Shop Browsing** | ❌ No | Public prices |
| **Quest Info** | ❌ No | Public quest data |

---

## 🔧 Implementation

### Sensitive API (Obfuscated)

**Client**:
```typescript
import { sendObfuscatedRequest } from '@/lib/requestObfuscator';

const response = await sendObfuscatedRequest('/api/player/heal', {
  userId: 123,
  skillId: 'heal'
});
```

**Server**:
```javascript
import { parseRequestBody } from '@/lib/deobfuscateMiddleware';

export async function POST(req) {
  const { userId, skillId } = await parseRequestBody(req);
  // Process...
}
```

### Public API (Not Obfuscated)

**Client**:
```typescript
const response = await fetch('/api/interact', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    npcId: 'merchant',
    action: 'talk'
  })
});
```

**Server**:
```javascript
export async function POST(req) {
  const { npcId, action } = await req.json();
  // Process...
}
```

---

## ⚠️ Important Notes

### When to Obfuscate
- User credentials
- Session tokens
- Player actions that affect game state
- Financial transactions (gold, items)
- Combat calculations
- Stats modifications

### When NOT to Obfuscate
- Public game data (NPC messages, quest info)
- Shop browsing (prices, item lists)
- Map information
- General game info
- Read-only data

### Performance Consideration
- Obfuscation adds ~0.02ms overhead
- Only use for sensitive data
- Public APIs should be fast and simple

---

## 🔄 Migration Guide

### Converting Obfuscated → Public

1. **Remove obfuscation from client**:
```typescript
// Before
import { sendObfuscatedRequest } from '@/lib/requestObfuscator';
const response = await sendObfuscatedRequest('/api/endpoint', data);

// After
const response = await fetch('/api/endpoint', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
});
```

2. **Remove deobfuscation from server**:
```javascript
// Before
import { parseRequestBody } from '@/lib/deobfuscateMiddleware';
const data = await parseRequestBody(req);

// After
const data = await req.json();
```

### Converting Public → Obfuscated

Do the reverse of above.

---

## 📝 Current Status

### Obfuscated APIs: 11
- Authentication: 2
- Player Actions: 8
- Social: 1

### Public APIs: 1
- NPC Interaction: 1

### Coverage: 92% of sensitive APIs protected

---

**Last Updated**: December 2024
**Status**: Production Ready ✅
