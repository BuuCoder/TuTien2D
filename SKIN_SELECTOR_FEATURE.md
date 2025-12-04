# Skin Selector Feature - Profile Menu

## Tổng Quan

Thêm chức năng chọn và trang bị skin vào ProfileMenu (menu profile góc trên bên trái). User có thể xem danh sách skin đã sở hữu và trang bị skin mong muốn.

## ✨ Features

### 1. Button "Trang Phục" trong Dropdown Menu
- Vị trí: Trong dropdown menu của ProfileMenu
- Icon: 👔
- Màu: Blue (#3b82f6)
- Hover effect: Light blue background

### 2. Skin Selector Modal
- **Design**: Modern modal với backdrop blur
- **Layout**: Grid responsive (auto-fill, minmax 140px)
- **Loading State**: Hiển thị "Đang tải..."
- **Empty State**: Hiển thị message khi chưa có skin

### 3. Skin Card
- **Icon**: Emoji tương ứng với skin
- **Name**: Tên skin
- **Status**: "Đang dùng" hoặc "Nhấn để trang bị"
- **Badge**: ✓ cho skin đang equipped
- **Border**: Green cho equipped, white cho unequipped
- **Hover**: Blue border và lift effect

### 4. Functionality
- Load danh sách skin đã sở hữu từ DB
- Click để trang bị skin
- Update DB khi trang bị
- Update UI real-time
- Notification feedback

## 🎨 UI Design

### Dropdown Menu
```
┌─────────────────────┐
│ 👔 Trang Phục       │ ← New button
│ 🚪 Đăng Xuất        │
└─────────────────────┘
```

### Skin Selector Modal
```
┌────────────────────────────────────┐
│ 👔 Chọn Trang Phục            ×   │
├────────────────────────────────────┤
│                                    │
│  ┌──────┐  ┌──────┐  ┌──────┐    │
│  │ 🛡️  │  │ ⚔️  │  │ 🔮  │    │
│  │Knight│  │Warrior│ │ Mage │    │
│  │✓Đang │  │Nhấn để│ │Nhấn để│   │
│  │ dùng │  │trang bị│ │trang bị│  │
│  └──────┘  └──────┘  └──────┘    │
│                                    │
│  ┌──────┐  ┌──────┐               │
│  │ 🗡️  │  │ 🐉  │               │
│  │Assassin│ │Dragon │             │
│  │Nhấn để│  │Knight │             │
│  │trang bị│ │Nhấn để│             │
│  └──────┘  └──────┘               │
│                                    │
│         [Đóng]                     │
└────────────────────────────────────┘
```

## 💻 Implementation

### State Management
```typescript
const [showSkinSelector, setShowSkinSelector] = useState(false);
const [skins, setSkins] = useState<any[]>([]);
const [loadingSkins, setLoadingSkins] = useState(false);
const [equippingSkin, setEquippingSkin] = useState(false);
```

### Load Skins
```typescript
const loadSkins = async () => {
    const response = await sendObfuscatedRequest('/api/skin/list', {
        userId: user.id,
        sessionId: user.sessionId,
        token: user.socketToken
    });
    
    // Chỉ lấy skin đã sở hữu
    const ownedSkins = response.skins.filter((s: any) => s.owned);
    setSkins(ownedSkins);
};
```

### Equip Skin
```typescript
const handleEquipSkin = async (skinId: string) => {
    const response = await sendObfuscatedRequest('/api/skin/equip', {
        userId: user.id,
        sessionId: user.sessionId,
        token: user.socketToken,
        skinId: skinId
    });
    
    if (response.success) {
        // Update user skin in store
        setUser({ ...user, skin: skinId });
        
        // Reload skins to update UI
        await loadSkins();
        
        // Show notification
        setNotification({ message: response.message, type: 'success' });
    }
};
```

## 🔄 User Flow

### Flow 1: Trang Bị Skin
```
1. User click vào Profile Card (góc trên trái)
   ↓
2. Dropdown menu hiển thị
   ↓
3. User click "👔 Trang Phục"
   ↓
4. Modal mở, load danh sách skin từ DB
   ↓
5. Hiển thị grid các skin đã sở hữu
   ↓
6. User click vào skin muốn trang bị
   ↓
7. Call API /api/skin/equip
   ↓
8. Update DB: users.skin = skinId
   ↓
9. Update store: user.skin = skinId
   ↓
10. Reload skin list (update equipped status)
    ↓
11. Show notification "Đã trang bị X!"
    ↓
12. Skin hiển thị trong game ngay lập tức
```

### Flow 2: Xem Skin Đã Có
```
1. User mở Skin Selector
   ↓
2. Xem danh sách skin đã sở hữu
   ↓
3. Skin đang dùng có badge ✓ và border xanh
   ↓
4. Các skin khác có thể click để trang bị
```

## 📊 Data Flow

### API Calls
1. **Load Skins**: `POST /api/skin/list`
   - Input: userId, sessionId, token
   - Output: Array of skins with owned/equipped status
   - Filter: Chỉ lấy skin có `owned: true`

2. **Equip Skin**: `POST /api/skin/equip`
   - Input: userId, sessionId, token, skinId
   - Output: success, message
   - Update: users.skin = skinId

### Database Updates
```sql
-- When equip skin
UPDATE users 
SET skin = ? 
WHERE id = ? 
AND EXISTS (
    SELECT 1 FROM user_skin 
    WHERE user_id = ? AND skin_id = ?
);
```

### Store Updates
```typescript
// Update user in Zustand store
setUser({ ...user, skin: skinId });

// This triggers re-render of Player component
// Player component uses user.skin to display correct sprite
```

## 🎯 Key Features

### 1. Real-time Update
- Skin thay đổi ngay lập tức trong game
- Không cần reload page
- Smooth transition

### 2. Visual Feedback
- Loading state khi load skins
- Disabled state khi đang equip
- Success notification
- Error notification
- Equipped badge

### 3. Validation
- Chỉ hiển thị skin đã sở hữu
- Không thể equip skin đang dùng
- Server-side validation (ownership check)

### 4. Empty State
- Hiển thị message khi chưa có skin
- Hướng dẫn user đi mua skin

## 📱 Responsive Design

### Desktop
- Grid: 3-4 columns
- Card size: 140px min
- Comfortable spacing

### Mobile
- Grid: 2-3 columns
- Smaller cards
- Touch-friendly

### Modal
- Max-width: 500px
- Max-height: 80vh
- Scrollable content
- Backdrop blur

## 🔒 Security

### Client-side
- Check if skin is owned before showing
- Disable button when equipping
- Validate user is logged in

### Server-side (API)
- Token authentication
- Ownership verification
- Database constraint check
- Transaction safety

## ✅ Testing Checklist

- [ ] Modal opens correctly
- [ ] Skins load from database
- [ ] Only owned skins displayed
- [ ] Equipped skin has badge
- [ ] Click to equip works
- [ ] Skin updates in game
- [ ] Notification shows
- [ ] Loading state works
- [ ] Empty state shows when no skins
- [ ] Close button works
- [ ] Click outside closes modal
- [ ] Responsive on mobile
- [ ] No errors in console

## 🎉 Benefits

### User Experience
- ✅ Easy access from profile menu
- ✅ Quick skin switching
- ✅ Visual preview of skins
- ✅ Clear equipped status
- ✅ Instant feedback

### Developer Experience
- ✅ Reuses existing API endpoints
- ✅ Clean component structure
- ✅ Type-safe
- ✅ Easy to maintain

### Performance
- ✅ Loads only owned skins
- ✅ Efficient API calls
- ✅ Optimistic UI updates
- ✅ No unnecessary re-renders

## 🚀 Future Enhancements

- [ ] Skin preview animation
- [ ] Skin categories/filters
- [ ] Favorite skins
- [ ] Skin stats display
- [ ] Quick equip from inventory
- [ ] Skin presets
- [ ] Skin comparison

## 📝 Related Files

### Modified
- `components/ProfileMenu.tsx` ✏️ UPDATED

### Used APIs
- `POST /api/skin/list` - Get owned skins
- `POST /api/skin/equip` - Equip skin

### Database Tables
- `users` - Store current equipped skin
- `user_skin` - Store owned skins

## Conclusion

Skin Selector feature hoàn chỉnh với:
- ✅ Easy access từ profile menu
- ✅ Beautiful modal UI
- ✅ Real-time updates
- ✅ Database integration
- ✅ Responsive design
- ✅ Error handling
- ✅ Loading states

User có thể dễ dàng xem và thay đổi trang phục của mình! 👔✨
