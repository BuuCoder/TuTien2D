# Debug: Skin Không Hiển Thị

## Vấn Đề
User có 3 skin trong database nhưng khi mở modal "Trang Phục" thì không thấy skin nào.

## Nguyên Nhân Có Thể

### 1. API Response Format
**Vấn đề**: `sendObfuscatedRequest` trả về Response object, cần gọi `.json()` để parse

**Fix**: Đã thêm `await response.json()` trong loadSkins và handleEquipSkin

### 2. Database Query
**Kiểm tra**: Xem có skin trong database không

```sql
-- Check user_skin table
SELECT * FROM user_skin WHERE user_id = YOUR_USER_ID;

-- Check users table
SELECT id, username, skin FROM users WHERE id = YOUR_USER_ID;
```

### 3. Filter Logic
**Kiểm tra**: Filter `s.owned` có đúng không

```typescript
const ownedSkins = data.skins.filter((s: any) => s.owned);
```

## Debug Steps

### Step 1: Check Console Logs
Đã thêm console.log để debug:

```typescript
console.log('[ProfileMenu] Skin list response:', data);
console.log('[ProfileMenu] Owned skins:', ownedSkins);
```

**Mở Console (F12)** và xem:
1. Response từ API có gì?
2. Có bao nhiêu skins trong response?
3. Có skin nào có `owned: true` không?

### Step 2: Check Database
```sql
-- 1. Check if user has skins
SELECT * FROM user_skin WHERE user_id = 1;

-- Expected output:
-- id | user_id | skin_id | purchased_at
-- 1  | 1       | knight  | 2024-...
-- 2  | 1       | warrior | 2024-...
-- 3  | 1       | mage    | 2024-...

-- 2. Check user's current skin
SELECT skin FROM users WHERE id = 1;

-- Expected output:
-- skin
-- knight
```

### Step 3: Check API Response
Mở Network tab (F12) và xem request `/api/skin/list`:

**Expected Response:**
```json
{
  "success": true,
  "skins": [
    {
      "id": "knight",
      "name": "Hiệp Sĩ",
      "price": 0,
      "owned": true,
      "equipped": true
    },
    {
      "id": "warrior",
      "name": "Chiến Binh",
      "price": 5000,
      "owned": true,
      "equipped": false
    },
    {
      "id": "mage",
      "name": "Pháp Sư",
      "price": 8000,
      "owned": true,
      "equipped": false
    }
  ],
  "currentSkin": "knight"
}
```

### Step 4: Check Filter
Nếu API trả về đúng nhưng vẫn không hiển thị, kiểm tra filter:

```typescript
// Before filter
console.log('All skins:', data.skins);

// After filter
const ownedSkins = data.skins.filter((s: any) => s.owned);
console.log('Owned skins:', ownedSkins);

// Check length
console.log('Number of owned skins:', ownedSkins.length);
```

## Common Issues & Solutions

### Issue 1: Response không có `.json()`
**Symptom**: Console log shows Response object thay vì data

**Solution**: ✅ Đã fix - thêm `await response.json()`

### Issue 2: Database không có data
**Symptom**: Query trả về empty

**Solution**: 
```sql
-- Insert default knight skin
INSERT INTO user_skin (user_id, skin_id) 
VALUES (YOUR_USER_ID, 'knight');
```

### Issue 3: API không trả về owned skins
**Symptom**: All skins có `owned: false`

**Solution**: Check API logic trong `/api/skin/list/route.ts`

```typescript
// Should query user_skin table
const [ownedSkins] = await db.query(
    'SELECT skin_id FROM user_skin WHERE user_id = ?',
    [userId]
);

const ownedSkinIds = ownedSkins.map((s: any) => s.skin_id);

// Should map correctly
const skinsWithStatus = allSkins.map(skin => ({
    ...skin,
    owned: ownedSkinIds.includes(skin.id), // ← Check this
    equipped: skin.id === currentSkin
}));
```

### Issue 4: Wrong user_id
**Symptom**: Query với wrong user_id

**Solution**: Check user.id trong request

```typescript
console.log('User ID:', user.id);
```

## Testing Checklist

- [ ] Open browser console (F12)
- [ ] Click "Trang Phục" button
- [ ] Check console logs:
  - [ ] `[ProfileMenu] Skin list response:` - có data?
  - [ ] `[ProfileMenu] Owned skins:` - có skins?
- [ ] Check Network tab:
  - [ ] Request `/api/skin/list` - status 200?
  - [ ] Response body - có skins?
- [ ] Check database:
  - [ ] `SELECT * FROM user_skin` - có records?
  - [ ] `SELECT skin FROM users` - có value?

## Quick Fix Commands

### Add Default Knight Skin
```sql
-- For user_id = 1
INSERT IGNORE INTO user_skin (user_id, skin_id) 
VALUES (1, 'knight');

-- For all users
INSERT IGNORE INTO user_skin (user_id, skin_id)
SELECT id, 'knight' FROM users;
```

### Check Current State
```sql
-- See all user skins
SELECT 
    u.id,
    u.username,
    u.skin as current_skin,
    GROUP_CONCAT(us.skin_id) as owned_skins
FROM users u
LEFT JOIN user_skin us ON u.id = us.user_id
GROUP BY u.id;
```

## Expected Console Output

### Success Case
```
[ProfileMenu] Skin list response: {
  success: true,
  skins: [...],
  currentSkin: "knight"
}
[ProfileMenu] Owned skins: [
  { id: "knight", name: "Hiệp Sĩ", owned: true, equipped: true },
  { id: "warrior", name: "Chiến Binh", owned: true, equipped: false },
  { id: "mage", name: "Pháp Sư", owned: true, equipped: false }
]
```

### Failure Case
```
[ProfileMenu] Skin list response: {
  success: true,
  skins: [...],
  currentSkin: "knight"
}
[ProfileMenu] Owned skins: []  ← PROBLEM: Empty array
```

## Next Steps

1. **Check console logs** - Xem response và filtered skins
2. **Check database** - Verify có data
3. **Check API** - Test endpoint trực tiếp
4. **Report findings** - Share console logs để debug tiếp

## Fixed Issues

✅ Added `await response.json()` to parse response
✅ Added console.log for debugging
✅ Added error handling

## Pending Verification

⏳ Waiting for console logs to verify actual issue
⏳ Need to check database records
⏳ Need to verify API response format
