# Hệ Thống Nhiều Map

## Tổng Quan

Game hiện đã hỗ trợ hệ thống nhiều map với các tính năng:
- Mỗi map có kích thước, background, NPCs và portals riêng
- Tự động chuyển map khi người chơi đi qua portal
- Hiển thị tên map hiện tại trên UI
- Giới hạn di chuyển theo kích thước map

## Cấu Trúc Map

Mỗi map được định nghĩa trong `lib/gameData.ts` với cấu trúc:

```typescript
{
    id: 'map1',                    // ID duy nhất của map
    name: 'Làng Tân Thủ',          // Tên hiển thị
    width: 1200,                   // Chiều rộng (pixels)
    height: 900,                   // Chiều cao (pixels)
    background: '/assets/...',     // Đường dẫn ảnh nền
    npcs: [                        // Danh sách NPC
        { 
            id: 'merchant',        // ID duy nhất của NPC
            x: 600,                // Vị trí X
            y: 300,                // Vị trí Y
            type: 'merchant'       // Loại NPC
        }
    ],
    portals: [                     // Cổng dịch chuyển
        { 
            x: 1150,               // Vị trí X của portal
            y: 450,                // Vị trí Y của portal
            targetMap: 'map2',     // Map đích
            targetX: 100,          // Vị trí X khi đến map đích
            targetY: 450,          // Vị trí Y khi đến map đích
            label: 'Rừng'          // Nhãn hiển thị
        }
    ]
}
```

## Cách Thêm Map Mới

### Bước 1: Thêm Map Config

Mở file `lib/gameData.ts` và thêm map mới vào object `MAPS`:

```typescript
export const MAPS: Record<string, MapConfig> = {
    // ... các map hiện có
    'map6': {
        id: 'map6',
        name: 'Tên Map Mới',
        width: 1200,
        height: 900,
        background: '/assets/background/your_image.jpeg',
        npcs: [
            { id: 'npc1', x: 400, y: 300, type: 'merchant' },
            { id: 'npc2', x: 800, y: 600, type: 'healer' }
        ],
        portals: [
            { 
                x: 1150, 
                y: 450, 
                targetMap: 'map1', 
                targetX: 100, 
                targetY: 450, 
                label: 'Về Làng' 
            }
        ]
    }
};
```

### Bước 2: Thêm Ảnh Nền

Đặt ảnh nền vào thư mục `public/assets/background/` với định dạng `.jpeg` hoặc `.png`

### Bước 3: Kết Nối Map

Thêm portal từ map khác để kết nối đến map mới:

```typescript
'map1': {
    // ... config hiện có
    portals: [
        // ... portals hiện có
        { 
            x: 600, 
            y: 850, 
            targetMap: 'map6', 
            targetX: 600, 
            targetY: 100, 
            label: 'Map Mới' 
        }
    ]
}
```

## Loại NPC Có Sẵn

- `merchant`: Thương nhân
- `healer`: Y sư
- `village-elder`: Trưởng làng
- `guard`: Lính canh

## Kích Thước Map Khuyến Nghị

- Map nhỏ: 1200x900
- Map trung bình: 1400x1000
- Map lớn: 1600x1200

## Lưu Ý

1. **ID phải duy nhất**: Mỗi map và NPC phải có ID không trùng lặp
2. **Portal 2 chiều**: Nếu muốn đi lại giữa 2 map, cần tạo portal ở cả 2 map
3. **Vị trí spawn**: Đảm bảo `targetX` và `targetY` không nằm ngoài giới hạn map đích
4. **Khoảng cách portal**: Người chơi tự động chuyển map khi ở trong bán kính 60 pixels từ portal

## Map Hiện Có

1. **Làng Tân Thủ** (map1) - 1200x900
   - NPCs: Thương nhân, Y sư, Trưởng làng
   - Kết nối: Rừng Hắc Ám

2. **Rừng Hắc Ám** (map2) - 1400x1000
   - NPCs: Lính canh
   - Kết nối: Làng Tân Thủ, Thành Chủ

3. **Thành Chủ** (map3) - 1600x1200
   - NPCs: Thương nhân, Y sư, 2 Lính canh
   - Kết nối: Rừng Hắc Ám, Đồng Cỏ

4. **Đồng Cỏ Xanh** (map4) - 1600x1200
   - NPCs: Nông dân
   - Kết nối: Thành Chủ, Hang Động

5. **Hang Động Bí Ẩn** (map5) - 1200x900
   - NPCs: Thương nhân
   - Kết nối: Đồng Cỏ
