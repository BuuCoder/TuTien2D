# Hướng Dẫn Tạo Assets Cho Skin Mới

## Yêu Cầu

Mỗi skin cần có các animation sau:

### 1. Idle Animation
- `down_idle.gif`: Đứng yên hướng xuống

### 2. Run Animation
- `up_run.gif`: Chạy hướng lên
- `down_run.gif`: Chạy hướng xuống
- `left_run.gif`: Chạy sang trái
- `right_run.gif`: Chạy sang phải

## Cấu Trúc Thư Mục

```
public/assets/
  └── [skin_id]/
      ├── idle/
      │   └── down_idle.gif
      └── run/
          ├── up_run.gif
          ├── down_run.gif
          ├── left_run.gif
          └── right_run.gif
```

## Thông Số Kỹ Thuật

- **Kích thước**: 64x64 pixels (hoặc tỷ lệ tương đương)
- **Format**: GIF animated
- **Frame rate**: 8-12 FPS
- **Background**: Transparent
- **Số frame**: 4-8 frames mỗi animation

## Danh Sách Skin Cần Tạo Assets

### 1. Warrior (Chiến Binh)
**Màu chủ đạo**: Đỏ, vàng đồng
**Đặc điểm**: 
- Giáp kim loại nặng
- Kiếm lớn hoặc búa
- Vẻ ngoài mạnh mẽ, hùng dũng

**Thư mục**: `public/assets/warrior/`

### 2. Mage (Pháp Sư)
**Màu chủ đạo**: Xanh dương, tím
**Đặc điểm**:
- Áo choàng dài
- Gậy phép hoặc sách phép
- Hiệu ứng ma thuật xung quanh

**Thư mục**: `public/assets/mage/`

### 3. Assassin (Sát Thủ)
**Màu chủ đạo**: Đen, xám
**Đặc điểm**:
- Trang phục nhẹ, linh hoạt
- Dao găm hoặc kunai
- Vẻ ngoài bí ẩn, nhanh nhẹn

**Thư mục**: `public/assets/assassin/`

### 4. Dragon Knight (Kỵ Sĩ Rồng)
**Màu chủ đạo**: Vàng, đỏ rực
**Đặc điểm**:
- Giáp rồng huyền thoại
- Kiếm rồng phát sáng
- Hiệu ứng lửa hoặc sét
- Vẻ ngoài uy nghiêm, huyền thoại

**Thư mục**: `public/assets/dragon_knight/`

## Cách Tạo Assets

### Option 1: Sử Dụng Sprite Existing
1. Tìm sprite sheet từ các nguồn miễn phí:
   - OpenGameArt.org
   - Itch.io
   - Kenney.nl
2. Cắt và chỉnh sửa sprite
3. Tạo GIF animation từ sprite frames

### Option 2: Tạo Mới
1. Sử dụng Aseprite hoặc Piskel
2. Vẽ từng frame animation
3. Export thành GIF

### Option 3: AI Generation
1. Sử dụng AI tools (Midjourney, DALL-E)
2. Generate sprite sheet
3. Chỉnh sửa và tạo animation

## Tools Đề Xuất

- **Aseprite**: Tạo pixel art và animation
- **Piskel**: Free online pixel art editor
- **GIMP**: Chỉnh sửa và tạo GIF
- **ImageMagick**: Convert và optimize GIF

## Script Tạo Placeholder

Nếu chưa có assets, có thể tạo placeholder bằng cách copy từ knight:

```bash
# Windows CMD
mkdir public\assets\warrior
xcopy /E /I public\assets\knight public\assets\warrior

mkdir public\assets\mage
xcopy /E /I public\assets\knight public\assets\mage

mkdir public\assets\assassin
xcopy /E /I public\assets\knight public\assets\assassin

mkdir public\assets\dragon_knight
xcopy /E /I public\assets\knight public\assets\dragon_knight
```

## Checklist Khi Thêm Skin Mới

- [ ] Tạo thư mục skin trong `public/assets/`
- [ ] Thêm `idle/down_idle.gif`
- [ ] Thêm `run/up_run.gif`
- [ ] Thêm `run/down_run.gif`
- [ ] Thêm `run/left_run.gif`
- [ ] Thêm `run/right_run.gif`
- [ ] Test animation trong game
- [ ] Optimize file size (< 100KB mỗi GIF)
- [ ] Kiểm tra transparent background
- [ ] Kiểm tra animation smooth

## Lưu Ý

1. **File Size**: Giữ file size nhỏ để tải nhanh (< 100KB mỗi file)
2. **Consistency**: Đảm bảo tất cả animation có cùng kích thước và style
3. **Performance**: Số frame không nên quá nhiều (4-8 frames là đủ)
4. **Quality**: Ưu tiên quality hơn quantity, tốt hơn có ít skin chất lượng cao

## Tạm Thời Sử Dụng Placeholder

Hiện tại có thể sử dụng knight assets làm placeholder cho các skin mới. Sau đó dần dần thay thế bằng assets thật.

Để tạo placeholder, chạy script trên hoặc copy thủ công thư mục `knight` và đổi tên.
