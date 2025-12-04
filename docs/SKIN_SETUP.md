# Hướng Dẫn Setup Hệ Thống Skin

## Bước 1: Cập Nhật Database

Chạy migration để thêm bảng và cột mới:

```bash
# Kết nối MySQL
mysql -u root -p

# Chọn database
USE tutien_2d;

# Chạy migration
SOURCE database/migration_add_skin.sql;

# Hoặc copy/paste từng câu lệnh SQL
```

Hoặc chạy từng câu lệnh:

```sql
-- 1. Thêm cột skin vào bảng users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS skin VARCHAR(50) DEFAULT 'knight' AFTER active_session_id;

-- 2. Tạo bảng user_skin
CREATE TABLE IF NOT EXISTS user_skin (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    skin_id VARCHAR(50) NOT NULL,
    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_skin (user_id, skin_id)
);

-- 3. Insert default knight skin cho tất cả users
INSERT IGNORE INTO user_skin (user_id, skin_id)
SELECT id, 'knight' FROM users;

-- 4. Update skin mặc định
UPDATE users SET skin = 'knight' WHERE skin IS NULL OR skin = '';
```

## Bước 2: Tạo Placeholder Assets

Chạy script để tạo placeholder assets (copy từ knight):

```bash
node scripts/create-skin-placeholders.js
```

Script này sẽ tạo các thư mục:
- `public/assets/warrior/`
- `public/assets/mage/`
- `public/assets/assassin/`
- `public/assets/dragon_knight/`

## Bước 3: Kiểm Tra Cấu Trúc File

Đảm bảo các file sau đã được tạo:

```
✓ database/migration_add_skin.sql
✓ database/schema.sql
✓ lib/skinData.ts
✓ app/api/skin/buy/route.ts
✓ app/api/skin/equip/route.ts
✓ app/api/skin/list/route.ts
✓ components/SkinShopPopup.tsx
✓ docs/SKIN_SYSTEM.md
✓ docs/SKIN_ASSETS_GUIDE.md
✓ scripts/create-skin-placeholders.js
```

## Bước 4: Test Chức Năng

### 4.1. Test Database
```sql
-- Kiểm tra cột skin đã được thêm
DESCRIBE users;

-- Kiểm tra bảng user_skin
DESCRIBE user_skin;

-- Kiểm tra data
SELECT * FROM user_skin;
```

### 4.2. Test Game

1. **Đăng nhập vào game**
2. **Đi đến Thành Chủ (map3)**
3. **Tìm NPC "Thợ May"** (vị trí x: 1200, y: 600)
4. **Tương tác với NPC**
5. **Chọn "Trang phục"**
6. **Thử mua một skin** (cần đủ vàng)
7. **Trang bị skin vừa mua**
8. **Kiểm tra skin đã thay đổi**

### 4.3. Test Multiplayer

1. Đăng nhập 2 tài khoản khác nhau
2. Một người mua và trang bị skin mới
3. Kiểm tra người chơi khác có thấy skin mới không

## Bước 5: Thêm Vàng Test (Optional)

Nếu cần thêm vàng để test:

```sql
-- Thêm 100,000 vàng cho user
UPDATE user_inventory SET gold = gold + 100000 WHERE user_id = 1;
```

## Troubleshooting

### Lỗi: Column 'skin' doesn't exist
```sql
-- Chạy lại migration
ALTER TABLE users ADD COLUMN skin VARCHAR(50) DEFAULT 'knight';
```

### Lỗi: Table 'user_skin' doesn't exist
```sql
-- Tạo lại bảng
CREATE TABLE user_skin (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    skin_id VARCHAR(50) NOT NULL,
    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_skin (user_id, skin_id)
);
```

### Lỗi: Skin không hiển thị
1. Kiểm tra assets có tồn tại không
2. Kiểm tra console log
3. Xóa cache browser (Ctrl + Shift + R)

### Lỗi: Không mua được skin
1. Kiểm tra user có đủ vàng không
2. Kiểm tra database connection
3. Xem server logs

## Các File Đã Được Cập Nhật

### Backend
- ✓ `app/api/auth/login/route.js` - Thêm trả về skin
- ✓ `lib/npcData.ts` - Thêm NPC skin-merchant
- ✓ `lib/gameData.ts` - Thêm NPC vào map3

### Frontend
- ✓ `components/Player.tsx` - Sử dụng skin từ user
- ✓ `components/OtherPlayers.tsx` - Hiển thị skin của người chơi khác
- ✓ `components/LoginPage.tsx` - Lưu skin vào store
- ✓ `components/MenuPopup.tsx` - Xử lý mua skin
- ✓ `components/NPC.tsx` - Thêm skin-merchant
- ✓ `lib/store.ts` - Thêm trường skin vào User interface

## Tính Năng Đã Hoàn Thành

- ✅ Database schema cho skin system
- ✅ API endpoints (buy, equip, list)
- ✅ NPC bán skin tại Thành Chủ
- ✅ UI hiển thị và mua skin
- ✅ Trang bị skin
- ✅ Hiển thị skin trong game
- ✅ Đồng bộ skin multiplayer
- ✅ 5 skin: knight, warrior, mage, assassin, dragon_knight

## Tính Năng Có Thể Mở Rộng

- [ ] Skin có hiệu ứng đặc biệt
- [ ] Skin giới hạn theo sự kiện
- [ ] Skin có thể trade giữa người chơi
- [ ] Preview skin trước khi mua
- [ ] Skin có bonus stats
- [ ] Gacha system cho skin hiếm

## Lưu Ý Quan Trọng

1. **Assets**: Hiện tại sử dụng placeholder (copy từ knight). Cần thay thế bằng assets thật để có trải nghiệm tốt hơn.

2. **Performance**: Nếu có nhiều skin, cân nhắc lazy loading assets.

3. **Security**: API đã có validation token và kiểm tra ownership.

4. **Multiplayer**: Skin được đồng bộ qua socket khi join channel và di chuyển.

## Hỗ Trợ

Nếu gặp vấn đề, xem:
- `docs/SKIN_SYSTEM.md` - Chi tiết về hệ thống
- `docs/SKIN_ASSETS_GUIDE.md` - Hướng dẫn tạo assets
- Server logs - Kiểm tra lỗi backend
- Browser console - Kiểm tra lỗi frontend
