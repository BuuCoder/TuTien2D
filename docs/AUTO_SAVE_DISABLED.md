# Auto-Save Stats Disabled

## Ngày cập nhật: 2025-12-03

## Vấn đề

Trước đây, `AutoSaveStats.tsx` component gọi API `/api/player/update-stats` mỗi 10 giây để lưu HP/MP vào database. Điều này gây ra:

1. ❌ **Quá nhiều API calls không cần thiết**
   - Gọi mỗi 10 giây bất kể có thay đổi hay không
   - Tốn bandwidth và server resources

2. ❌ **Không đồng bộ với hệ thống mới**
   - API `/api/player/update-stats` đã bị sửa để KHÔNG cho phép update HP/MP
   - HP/MP bây giờ được update qua các API chuyên dụng

3. ❌ **Race condition**
   - AutoSave có thể ghi đè HP/MP đã được update bởi API khác
   - Gây ra inconsistency

## Giải pháp

### HP/MP được tự động update qua các API chuyên dụng

Không cần AutoSave nữa vì HP/MP đã được update tự động:

| Action | API | HP/MP Update |
|--------|-----|--------------|
| Hồi phục HP | `POST /api/player/heal` | ✅ HP tăng, MP giảm |
| Dùng skill | `POST /api/player/use-skill` | ✅ MP giảm |
| Nhận damage | `POST /api/player/take-damage` | ✅ HP giảm |
| Level up | `POST /api/player/update-max-stats` | ✅ Max HP/MP tăng |

### AutoSaveStats.tsx bây giờ

```typescript
/**
 * Component này KHÔNG CÒN tự động lưu HP/MP nữa
 * 
 * HP/MP được tự động cập nhật qua các API chuyên dụng:
 * - /api/player/heal - Khi hồi phục HP
 * - /api/player/use-skill - Khi dùng skill (trừ MP)
 * - /api/player/take-damage - Khi nhận damage (trừ HP)
 */
const AutoSaveStats = () => {
  // Component chỉ log thông báo
  console.log('[AutoSave] HP/MP auto-save is DISABLED');
  return null;
};
```

## Flow mới

### Trước (❌ Cũ)
```
User action → Update local state → Wait 10s → AutoSave → API call
                                                          ↓
                                                    Update database
```

**Vấn đề:**
- Delay 10 giây trước khi save
- Có thể mất data nếu đóng tab trước 10s
- Gọi API ngay cả khi không có thay đổi

### Bây giờ (✅ Mới)
```
User action → API call → Update database → Update local state
              ↓
        Validate & Calculate
```

**Ưu điểm:**
- ✅ Instant save, không delay
- ✅ Server-side validation
- ✅ Không mất data
- ✅ Chỉ gọi API khi có action thực sự

## Ví dụ

### 1. Hồi phục HP

**Trước:**
```typescript
// Client tự tính toán
const newHp = Math.min(currentHp + 50, maxHp);
setPlayerStats({ currentHp: newHp });

// Đợi 10s → AutoSave gọi API
// Nếu đóng tab trước 10s → mất data
```

**Bây giờ:**
```typescript
// Gọi API ngay
const result = await healPlayer(auth, 'heal');

// Server tính toán và validate
// Database được update ngay lập tức
// Client nhận kết quả chính xác
setPlayerStats({ 
  currentHp: result.hp,  // Từ server
  mp: result.mp          // Từ server
});
```

### 2. Nhận damage

**Trước:**
```typescript
// Client tự trừ HP
const newHp = Math.max(currentHp - damage, 0);
setPlayerStats({ currentHp: newHp });

// Đợi 10s → AutoSave
// Attacker có thể gửi damage giả
```

**Bây giờ:**
```typescript
// Server validate và tính toán
const result = await takeDamage(auth, attackerId, skillId);

// Database được update ngay
// Client nhận HP chính xác từ server
setPlayerStats({ currentHp: result.hp });

if (result.isDead) {
  handleDeath();
}
```

## Migration

### Không cần làm gì!

Hệ thống mới tự động hoạt động. HP/MP được sync với database qua các API chuyên dụng.

### Nếu muốn xóa AutoSaveStats component

1. Xóa `<AutoSaveStats />` từ `GameContent.tsx`
2. Xóa file `components/AutoSaveStats.tsx`

**Lưu ý:** Component hiện tại không làm gì ngoài log, nên có thể giữ lại hoặc xóa đều được.

## Testing

### Test 1: HP/MP được save ngay khi heal
```
1. Dùng skill Heal
2. Check database ngay lập tức
3. Expected: ✅ HP đã tăng, MP đã giảm trong database
```

### Test 2: HP/MP được save ngay khi nhận damage
```
1. Nhận damage từ quái
2. Check database ngay lập tức
3. Expected: ✅ HP đã giảm trong database
```

### Test 3: Không có API calls không cần thiết
```
1. Đứng yên không làm gì
2. Monitor network tab
3. Expected: ✅ Không có calls đến /api/player/update-stats
```

### Test 4: Đóng tab không mất data
```
1. Dùng skill Heal
2. Đóng tab ngay lập tức
3. Login lại
4. Expected: ✅ HP/MP đúng như lúc heal
```

## Performance Impact

### Trước
- API calls: ~6 calls/phút (mỗi 10s)
- Bandwidth: ~6 KB/phút
- Database writes: ~6 writes/phút (bất kể có thay đổi hay không)

### Bây giờ
- API calls: Chỉ khi có action (heal, attack, take damage)
- Bandwidth: Chỉ khi cần thiết
- Database writes: Chỉ khi có thay đổi thực sự

**Ví dụ:**
- Đứng yên 10 phút: 0 API calls (thay vì 60 calls)
- Combat 1 phút: ~10-20 API calls (tùy số lần dùng skill)

## Benefits

1. ✅ **Giảm API calls không cần thiết**
   - Từ 6 calls/phút → 0 calls khi idle
   - Chỉ call khi có action thực sự

2. ✅ **Instant save**
   - Không delay 10 giây
   - Không mất data khi đóng tab

3. ✅ **Server-side validation**
   - Không thể gửi HP/MP giả
   - Damage được tính toán ở server

4. ✅ **Better consistency**
   - Không có race condition
   - Database luôn đúng

5. ✅ **Better performance**
   - Ít API calls hơn
   - Ít database writes hơn
   - Ít bandwidth hơn

## Future

### Gold/Items Auto-Save

Nếu cần auto-save cho gold/items trong tương lai:

```typescript
const AutoSaveStats = () => {
  const { user, gold, items } = useGameStore();
  const lastSaved = useRef({ gold: 0, items: [] });

  useEffect(() => {
    // Check if gold/items changed
    const hasChanged = 
      lastSaved.current.gold !== gold ||
      JSON.stringify(lastSaved.current.items) !== JSON.stringify(items);

    if (!hasChanged) return;

    // Debounce 5 seconds
    const timeout = setTimeout(async () => {
      await fetch('/api/player/update-stats', {
        method: 'POST',
        body: JSON.stringify({ userId, sessionId, token, gold, items })
      });
      
      lastSaved.current = { gold, items };
    }, 5000);

    return () => clearTimeout(timeout);
  }, [user, gold, items]);

  return null;
};
```

## Summary

**Key Changes:**
- ❌ AutoSave HP/MP mỗi 10 giây → Disabled
- ✅ HP/MP được update qua API chuyên dụng
- ✅ Instant save, không delay
- ✅ Server-side validation
- ✅ Giảm API calls không cần thiết

**Result:**
- Better performance
- Better security
- Better consistency
- Better user experience
