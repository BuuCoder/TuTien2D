# MP Regeneration System

## Ngày cập nhật: 2025-12-03

## Tổng quan

Hệ thống MP regeneration tự động hồi phục MP cho người chơi và đồng bộ với database.

## Thông số

- **Regeneration Rate:** +30 MP mỗi 10 giây
- **Sync Interval:** 10 giây (batch update)
- **Max MP:** Không vượt quá max_mp của người chơi

## So sánh

### Trước
- ❌ +2 MP mỗi giây (quá nhanh)
- ❌ Không sync với database
- ❌ Mất MP khi reload

### Bây giờ
- ✅ +30 MP mỗi 10 giây (cân bằng hơn)
- ✅ Sync với database mỗi 10 giây
- ✅ Không mất MP khi reload

## Implementation

### Client Side (`components/CombatManager.tsx`)

```typescript
// MP regeneration: +30 MP mỗi 10 giây và sync với database
useEffect(() => {
  if (!user) return;

  const interval = setInterval(async () => {
    const state = useGameStore.getState();
    const mp = state.playerStats.mp;
    const maxMp = state.playerStats.maxMp;
    
    if (mp < maxMp) {
      const newMp = Math.min(maxMp, mp + 30);
      
      // Update local state ngay
      setPlayerStats({ mp: newMp });
      
      // Sync với database (batch update mỗi 10s)
      try {
        const response = await fetch('/api/player/regen-mp', {
          method: 'POST',
          body: JSON.stringify({
            userId: user.id,
            sessionId: user.sessionId,
            token: user.socketToken,
            mp: newMp
          })
        });

        if (response.ok) {
          console.log('[MP Regen] Synced with database:', newMp);
        }
      } catch (error) {
        console.error('[MP Regen] Failed to sync:', error);
      }
    }
  }, 10000); // 10 giây

  return () => clearInterval(interval);
}, [user, setPlayerStats]);
```

### Server Side (`app/api/player/regen-mp/route.js`)

```javascript
export async function POST(req) {
  const { userId, sessionId, token, mp } = await req.json();

  // Verify token
  const tokenResult = verifyToken(token);
  if (!tokenResult.valid) {
    return NextResponse.json({ error: 'Token không hợp lệ' }, { status: 401 });
  }

  // Lấy max_mp từ database để validate
  const [stats] = await db.query(
    'SELECT max_mp FROM user_stats WHERE user_id = ?',
    [userId]
  );

  const maxMp = stats[0].max_mp;

  // Validate MP không vượt quá max
  if (mp > maxMp) {
    return NextResponse.json({ error: 'MP không thể vượt quá max MP' }, { status: 400 });
  }

  // Update MP trong database
  await db.query(
    'UPDATE user_stats SET mp = ? WHERE user_id = ?',
    [mp, userId]
  );

  return NextResponse.json({ success: true, mp, maxMp });
}
```

## Flow Diagram

```
Every 10 seconds:
    ↓
Check if MP < Max MP
    ↓
Calculate new MP = min(max, current + 30)
    ↓
Update local state (instant UI update)
    ↓
Call /api/player/regen-mp
    ↓
Server validates:
  - Token valid?
  - MP <= max MP?
    ↓
Server updates database
    ↓
Server returns success
    ↓
Console log: "MP Regen synced"
```

## API Calls Frequency

### Scenario 1: MP đầy
- MP = 200, Max MP = 200
- API calls: **0 calls** (không cần regen)

### Scenario 2: MP thấp
- MP = 50, Max MP = 200
- Regen: 50 → 80 → 110 → 140 → 170 → 200
- Time: 50 seconds (5 ticks)
- API calls: **5 calls** (1 call mỗi 10s)

### Scenario 3: Combat active
- Dùng skill → MP giảm → Regen bắt đầu
- API calls: **Tùy vào combat frequency**

## Performance

### Old System (❌)
- Regen: +2 MP/second
- Sync: Never
- API calls: 0 (nhưng mất data khi reload)

### New System (✅)
- Regen: +30 MP/10 seconds
- Sync: Every 10 seconds (when regenerating)
- API calls: 0-6 per minute (chỉ khi MP < max)

**Comparison:**
- Idle (MP full): 0 calls/minute (same as old)
- Regenerating: ~6 calls/minute (acceptable)
- Total bandwidth: ~1-2 KB/minute (minimal)

## Balance

### Regeneration Rate

**+30 MP mỗi 10 giây = +3 MP/giây**

**Skill MP Costs:**
- Basic Attack: 0 MP
- Slash: 10 MP (3.3s to regen)
- Charge: 15 MP (5s to regen)
- Fireball: 20 MP (6.7s to regen)
- Ice Spike: 25 MP (8.3s to regen)
- Heal: 20 MP (6.7s to regen)
- Holy Strike: 30 MP (10s to regen)
- Block: 10 MP (3.3s to regen)

**Analysis:**
- Light combat: Regen > Usage → MP increases over time
- Heavy combat: Usage > Regen → MP decreases over time
- Balanced combat: Regen ≈ Usage → MP stable

**Example:**
```
Player uses Fireball (20 MP) every 5 seconds:
- MP usage: 20 MP / 5s = 4 MP/s
- MP regen: 30 MP / 10s = 3 MP/s
- Net: -1 MP/s → MP slowly decreases

Player uses Slash (10 MP) every 3 seconds:
- MP usage: 10 MP / 3s = 3.3 MP/s
- MP regen: 30 MP / 10s = 3 MP/s
- Net: -0.3 MP/s → MP slowly decreases

Player uses skills occasionally:
- MP regen > usage → MP increases
```

## Testing

### Test 1: MP regenerates correctly
```
1. Use skill to reduce MP to 50
2. Wait 10 seconds
3. Expected: ✅ MP = 80 (50 + 30)
4. Wait 10 seconds
5. Expected: ✅ MP = 110 (80 + 30)
```

### Test 2: MP syncs with database
```
1. Use skill to reduce MP to 50
2. Wait 10 seconds (MP = 80)
3. Check database
4. Expected: ✅ MP = 80 in database
```

### Test 3: MP doesn't exceed max
```
1. MP = 190, Max MP = 200
2. Wait 10 seconds
3. Expected: ✅ MP = 200 (not 220)
```

### Test 4: Reload preserves MP
```
1. Use skill to reduce MP to 50
2. Wait 10 seconds (MP = 80)
3. Reload page
4. Login again
5. Expected: ✅ MP = 80 (from database)
```

### Test 5: No API calls when MP full
```
1. MP = 200, Max MP = 200
2. Wait 1 minute
3. Monitor network tab
4. Expected: ✅ No calls to /api/player/regen-mp
```

## Error Handling

### Network Error
```typescript
try {
  await fetch('/api/player/regen-mp', { ... });
} catch (error) {
  console.error('[MP Regen] Failed to sync:', error);
  // Local state still updated
  // Will retry in next 10s interval
}
```

### Token Invalid
```javascript
// Server response: { error: "Token không hợp lệ" }
// Client should redirect to login
```

### MP Exceeds Max
```javascript
// Server response: { error: "MP không thể vượt quá max MP" }
// This should never happen if client validates correctly
```

## Benefits

1. ✅ **Balanced Regeneration**
   - +30 MP/10s is balanced for gameplay
   - Not too fast, not too slow

2. ✅ **Database Sync**
   - MP is saved every 10 seconds
   - No data loss on reload

3. ✅ **Minimal API Calls**
   - Only calls when regenerating
   - 0 calls when MP is full

4. ✅ **Server Validation**
   - MP cannot exceed max
   - Token authentication

5. ✅ **Good UX**
   - Instant UI update (local state)
   - Background sync (no lag)

## Future Improvements

1. **Adaptive Regen Rate**
   - Faster regen out of combat
   - Slower regen in combat

2. **Regen Buffs**
   - Items that increase regen rate
   - Skills that boost regen

3. **Regen Pause**
   - Pause regen when using skills
   - Resume after X seconds

4. **Visual Indicator**
   - Show regen animation on MP bar
   - Show "+30 MP" text

## Summary

**Key Changes:**
- ✅ MP regen: +2/s → +30/10s
- ✅ Database sync: Never → Every 10s
- ✅ API calls: 0 → 0-6/minute (only when regenerating)

**Result:**
- Better balance
- Data persistence
- Minimal performance impact
