# Hệ Thống Trang Phục (Skin System)

## Tổng Quan

Hệ thống trang phục cho phép người chơi mua và trang bị các bộ trang phục khác nhau cho nhân vật của mình.

## Cấu Trúc Database

### Bảng `users`
- Thêm cột `skin` (VARCHAR(50), DEFAULT 'knight'): Lưu skin hiện tại đang trang bị

### Bảng `user_skin`
- `id`: Primary key
- `user_id`: Foreign key đến bảng users
- `skin_id`: ID của skin (VARCHAR(50))
- `purchased_at`: Thời gian mua

## Danh Sách Skin

| Skin ID | Tên | Giá | Độ Hiếm | Mô Tả |
|---------|-----|-----|---------|-------|
| knight | Hiệp Sĩ | 0 | Common | Trang phục mặc định |
| warrior | Chiến Binh | 5,000 | Rare | Trang phục chiến binh dũng mãnh |
| mage | Pháp Sư | 8,000 | Epic | Trang phục pháp sư huyền bí |
| assassin | Sát Thủ | 10,000 | Epic | Trang phục sát thủ tàng hình |
| dragon_knight | Kỵ Sĩ Rồng | 20,000 | Legendary | Trang phục kỵ sĩ rồng huyền thoại |

## Cách Sử Dụng

### 1. Mua Skin

Người chơi có thể mua skin từ:
- **NPC Thợ May** tại Thành Chủ (map3)
- Vị trí: x: 1200, y: 600

### 2. Trang Bị Skin

Sau khi mua, người chơi có thể:
1. Mở menu NPC Thợ May
2. Chọn skin đã mua
3. Nhấn "Trang bị"

### 3. Xem Skin Đã Sở Hữu

Người chơi có thể xem danh sách skin đã sở hữu qua:
- Menu NPC Thợ May
- API endpoint: `/api/skin/list`

## API Endpoints

### POST /api/skin/buy
Mua skin mới

**Request:**
```json
{
  "userId": 1,
  "sessionId": "...",
  "token": "...",
  "skinId": "warrior"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Đã mua trang phục Chiến Binh!",
  "gold": 45000,
  "skinId": "warrior"
}
```

### POST /api/skin/equip
Trang bị skin đã sở hữu

**Request:**
```json
{
  "userId": 1,
  "sessionId": "...",
  "token": "...",
  "skinId": "warrior"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Đã trang bị Chiến Binh!",
  "skinId": "warrior"
}
```

### POST /api/skin/list
Lấy danh sách tất cả skin và trạng thái sở hữu

**Request:**
```json
{
  "userId": 1,
  "sessionId": "...",
  "token": "..."
}
```

**Response:**
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
    }
  ],
  "currentSkin": "knight"
}
```

## Cấu Trúc Assets

Mỗi skin cần có cấu trúc thư mục như sau:

```
public/assets/
  ├── knight/          (skin mặc định)
  │   ├── idle/
  │   │   └── down_idle.gif
  │   └── run/
  │       ├── up_run.gif
  │       ├── down_run.gif
  │       ├── left_run.gif
  │       └── right_run.gif
  ├── warrior/         (skin mới)
  │   ├── idle/
  │   │   └── down_idle.gif
  │   └── run/
  │       ├── up_run.gif
  │       ├── down_run.gif
  │       ├── left_run.gif
  │       └── right_run.gif
  └── ... (các skin khác)
```

## Hướng Dẫn Thêm Skin Mới

### 1. Thêm Skin Data

Cập nhật file `lib/skinData.ts`:

```typescript
export const SKINS: Record<string, SkinData> = {
  // ... existing skins
  new_skin: {
    id: 'new_skin',
    name: 'Tên Skin Mới',
    description: 'Mô tả skin',
    price: 15000,
    assetPath: '/assets/new_skin',
    rarity: 'epic',
    isDefault: false
  }
};
```

### 2. Thêm NPC Data

Cập nhật file `lib/npcData.ts`:

```typescript
'skin-merchant': {
  message: 'Chào mừng đến cửa hàng trang phục!',
  menu: [
    {
      id: 'skins',
      name: 'Trang phục',
      items: [
        // ... existing skins
        { 
          id: 'skin-new_skin', 
          name: 'Tên Skin Mới', 
          price: 15000, 
          image: '🎭', 
          description: 'Mô tả skin' 
        }
      ]
    }
  ]
}
```

### 3. Thêm Assets

Tạo thư mục và thêm các file GIF animation:
- `public/assets/new_skin/idle/down_idle.gif`
- `public/assets/new_skin/run/up_run.gif`
- `public/assets/new_skin/run/down_run.gif`
- `public/assets/new_skin/run/left_run.gif`
- `public/assets/new_skin/run/right_run.gif`

## Migration Database

Chạy file migration để cập nhật database:

```bash
mysql -u root -p tutien_2d < database/migration_add_skin.sql
```

Hoặc chạy từng câu lệnh SQL:

```sql
-- Thêm cột skin vào bảng users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS skin VARCHAR(50) DEFAULT 'knight' AFTER active_session_id;

-- Tạo bảng user_skin
CREATE TABLE IF NOT EXISTS user_skin (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    skin_id VARCHAR(50) NOT NULL,
    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_skin (user_id, skin_id)
);

-- Insert default knight skin cho tất cả users
INSERT IGNORE INTO user_skin (user_id, skin_id)
SELECT id, 'knight' FROM users;
```

## Lưu Ý

1. **Assets**: Hiện tại chỉ có assets cho skin `knight`. Cần tạo assets cho các skin khác (warrior, mage, assassin, dragon_knight).

2. **Multiplayer**: Skin của người chơi sẽ được đồng bộ qua socket khi join channel và di chuyển.

3. **Validation**: Server sẽ kiểm tra:
   - User có đủ vàng để mua không
   - User đã sở hữu skin chưa
   - Skin có tồn tại không

4. **Performance**: Skin data được cache ở client để giảm số lần gọi API.

## Troubleshooting

### Skin không hiển thị
- Kiểm tra assets có đúng đường dẫn không
- Kiểm tra tên file GIF có đúng format không
- Xem console log để debug

### Không mua được skin
- Kiểm tra user có đủ vàng không
- Kiểm tra database connection
- Xem server logs để debug

### Skin không đồng bộ multiplayer
- Kiểm tra socket connection
- Kiểm tra server.js có gửi skin data không
- Xem network tab để debug
