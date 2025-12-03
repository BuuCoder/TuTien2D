# UI Updates - Logout & Combat Bar

## Ngày cập nhật: 2025-12-03

## Thay đổi

### 1. Nút Đăng xuất (Logout Button)

**Vị trí:** Góc trên bên phải màn hình

**Tính năng:**
- Hiển thị thông tin user (username, level)
- Nút đăng xuất với xác nhận
- Loading state khi đang đăng xuất
- Tự động reload page sau khi logout thành công

**UI:**
```
┌─────────────────────────────────────┐
│ 👤 username          🚪 Đăng xuất   │
│    Level 1                          │
└─────────────────────────────────────┘
```

**Flow:**
1. Click nút "Đăng xuất"
2. Hiện confirm dialog: "Bạn có chắc muốn đăng xuất?"
3. Nếu OK:
   - Gọi API `/api/auth/logout`
   - Clear user data từ store
   - Clear localStorage
   - Hiện notification "Đăng xuất thành công!"
   - Reload page sau 500ms
4. Nếu Cancel: Không làm gì

**Code:**
```typescript
const handleLogout = async () => {
  const confirmLogout = window.confirm('Bạn có chắc muốn đăng xuất?');
  if (!confirmLogout) return;

  const response = await fetch('/api/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ userId, sessionId, token })
  });

  if (response.ok) {
    setUser(null);
    localStorage.clear();
    window.location.reload();
  }
};
```

---

### 2. Thanh Combat luôn hiển thị

**Trước đây:**
- Thanh combat chỉ hiện khi bật PK mode hoặc đang trong PK
- Người chơi không thấy skills khi không combat

**Bây giờ:**
- Thanh combat **LUÔN LUÔN** hiển thị ở dưới màn hình
- Người chơi có thể xem skills bất cứ lúc nào
- Vẫn cần bật PK mode để sử dụng skills

**Vị trí:** Dưới cùng màn hình, giữa

**UI:**
```
┌──────────────────────────────────────────────────────┐
│  [⚔️] [🗡️] [⚡] [🔥] [❄️] [💚] [⚡] [🛡️]              │
│   1    2    3    4    5    6    7    8               │
└──────────────────────────────────────────────────────┘
```

**Skills:**
1. ⚔️ Basic Attack (0 MP)
2. 🗡️ Slash (10 MP)
3. ⚡ Charge (15 MP)
4. 🔥 Fireball (20 MP)
5. ❄️ Ice Spike (25 MP)
6. 💚 Heal (20 MP)
7. ⚡ Holy Strike (30 MP)
8. 🛡️ Block (5 MP)

**Tính năng:**
- Hiển thị icon skill
- Hiển thị hotkey (1-8)
- Hiển thị MP cost
- Hiển thị cooldown overlay
- Màu xanh khi có thể dùng
- Màu xám khi không đủ MP hoặc đang cooldown
- Tooltip khi hover (desktop)

---

## Responsive Design

### Desktop
- Nút logout: Full size với text
- Thanh combat: 45x45px mỗi skill
- Spacing: 6px giữa các skill

### Mobile
- Nút logout: Compact với icon
- Thanh combat: 35x35px mỗi skill
- Spacing: 5px giữa các skill

---

## Screenshots

### Top Bar
```
┌────────────────────────────────────────────────────────┐
│ 📍 Làng Khởi Đầu              👤 player1  🚪 Đăng xuất │
│    Kênh 1                        Level 1               │
└────────────────────────────────────────────────────────┘
```

### Combat Bar (Always Visible)
```
                    ┌─ HP/MP bars ─┐
                    │  HP: 100/100 │
                    │  MP: 50/50   │
                    └──────────────┘

┌──────────────────────────────────────────────────────┐
│  [⚔️] [🗡️] [⚡] [🔥] [❄️] [💚] [⚡] [🛡️]              │
│   1    2    3    4    5    6    7    8               │
│   0   10   15   20   25   20   30    5   ← MP cost  │
└──────────────────────────────────────────────────────┘
```

---

## API Integration

### Logout API

**Endpoint:** `POST /api/auth/logout`

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
  "message": "Đăng xuất thành công"
}
```

**Features:**
- Clear active_session_id trong database
- Cho phép logout ngay cả khi token expired
- Log logout event

---

## Files Changed

### New
- `app/api/auth/logout/route.js` - Logout API endpoint

### Modified
- `components/UI.tsx` - Thêm logout button và user info
- `components/CombatUI.tsx` - Hiển thị combat bar luôn
- `lib/playerStatsAPI.ts` - Thêm logout() helper function

---

## Testing

### Test Logout
1. Đăng nhập vào game
2. Click nút "Đăng xuất" ở góc trên phải
3. Confirm dialog xuất hiện
4. Click OK
5. Kiểm tra:
   - ✅ API `/api/auth/logout` được gọi
   - ✅ User data bị clear
   - ✅ localStorage bị clear
   - ✅ Notification "Đăng xuất thành công!" hiện ra
   - ✅ Page reload về login screen

### Test Combat Bar
1. Đăng nhập vào game
2. Kiểm tra:
   - ✅ Thanh combat hiển thị ở dưới màn hình
   - ✅ 8 skills hiển thị đầy đủ
   - ✅ Hotkey 1-8 hiển thị
   - ✅ MP cost hiển thị
   - ✅ Skills màu xám khi không đủ MP
   - ✅ Skills màu xanh khi có thể dùng
   - ✅ Cooldown overlay hoạt động
   - ✅ Tooltip hiển thị khi hover (desktop)

---

## User Experience

### Before
- Người chơi không biết có skills gì khi không combat
- Phải bật PK mode mới thấy thanh combat
- Không có cách đăng xuất ngoài reload page

### After
- ✅ Thanh combat luôn hiển thị → người chơi biết có skills gì
- ✅ Có thể xem MP cost và cooldown bất cứ lúc nào
- ✅ Nút đăng xuất rõ ràng với xác nhận
- ✅ Hiển thị user info (username, level) ở góc trên phải

---

## Future Improvements

### Logout
- [ ] Thêm option "Remember me" để không cần login lại
- [ ] Logout tất cả devices
- [ ] Logout history/log

### Combat Bar
- [ ] Drag & drop để sắp xếp skills
- [ ] Custom hotkeys
- [ ] Skill presets/loadouts
- [ ] Skill upgrade/level up system

---

## Notes

- Logout API cho phép logout ngay cả khi token expired để tránh user bị stuck
- Combat bar luôn hiển thị nhưng vẫn cần PK mode để sử dụng skills
- User info hiển thị level từ user object (cần sync với database)
