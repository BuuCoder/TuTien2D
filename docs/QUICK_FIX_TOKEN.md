# 🚀 Quick Fix: Token Invalid Error

## ❌ Lỗi Bạn Đang Gặp

```
[Auth] Token invalid, clearing session
```

## ✅ Giải Pháp (3 Bước)

### Bước 1: Clear localStorage

Mở **Console** trong browser (nhấn **F12**), chạy lệnh:

```javascript
localStorage.clear();
console.log('✅ Đã xóa localStorage');
```

### Bước 2: Reload Trang

Nhấn **F5** hoặc **Ctrl+R** để reload trang.

### Bước 3: Đăng Nhập Lại

Đăng nhập với tài khoản của bạn:
- Username: `player1` hoặc `player2`
- Password: `123456`

## 🎯 Kết Quả

Sau khi đăng nhập, bạn sẽ thấy:

```
✅ Connected to socket server
✅ Session validated, auto-joining channel 1
✅ Joined channel 1
```

**KHÔNG còn** thấy:
```
❌ [Auth] Token invalid, clearing session
```

## 🔍 Tại Sao Cần Làm Vậy?

1. **JWT_SECRET đã thay đổi** trong file `.env`
2. **Server đã restart** để load JWT_SECRET mới
3. **Token cũ không còn hợp lệ** (được tạo với secret cũ)
4. **Cần token mới** (được tạo với secret mới)

## 📊 Kiểm Tra Token

Sau khi đăng nhập thành công, mở Console và chạy:

```javascript
const user = JSON.parse(localStorage.getItem('tutien2d_user'));
if (user && user.socketToken) {
    const payload = JSON.parse(atob(user.socketToken.split('.')[1]));
    console.log('✅ Token Info:', {
        userId: payload.userId,
        username: payload.username,
        expires: new Date(payload.exp * 1000).toLocaleString(),
        valid: Date.now() < payload.exp * 1000
    });
} else {
    console.log('❌ No token found');
}
```

Bạn sẽ thấy:
```
✅ Token Info: {
    userId: 1,
    username: "player1",
    expires: "3/12/2025, 10:30:00 AM",  // 24 giờ từ bây giờ
    valid: true
}
```

## 🐛 Nếu Vẫn Gặp Lỗi

### Lỗi: "Token không hợp lệ: invalid signature"

**Nguyên nhân**: Server chưa restart sau khi thêm JWT_SECRET

**Giải pháp**:
1. Stop server (Ctrl+C trong terminal)
2. Start lại: `npm run dev`
3. Clear localStorage
4. Đăng nhập lại

### Lỗi: "Token không hợp lệ: jwt expired"

**Nguyên nhân**: Token đã hết hạn (> 24 giờ)

**Giải pháp**:
1. Clear localStorage
2. Đăng nhập lại

### Lỗi: "Token không được cung cấp"

**Nguyên nhân**: localStorage bị xóa hoặc chưa đăng nhập

**Giải pháp**:
1. Đăng nhập lại

## 📝 Checklist

- [ ] Server đã restart (sau khi thêm JWT_SECRET)
- [ ] localStorage đã clear (`localStorage.clear()`)
- [ ] Trang đã reload (F5)
- [ ] Đã đăng nhập lại
- [ ] Thấy "Session validated" trong console
- [ ] Không còn thấy "Token invalid"

## 💡 Lưu Ý

- **Chỉ cần làm 1 lần** sau khi thay đổi JWT_SECRET
- **Token mới có hiệu lực 24 giờ**
- **Không cần clear localStorage mỗi lần đăng nhập**
- **Chỉ clear khi thay đổi JWT_SECRET hoặc token hết hạn**

## 🎉 Hoàn Thành!

Sau khi làm theo 3 bước trên, game sẽ hoạt động bình thường:
- ✅ Socket kết nối thành công
- ✅ Auto-save HP/Mana hoạt động
- ✅ Multiplayer hoạt động
- ✅ Chat hoạt động
- ✅ PK hoạt động

Chúc bạn chơi game vui vẻ! 🎮
