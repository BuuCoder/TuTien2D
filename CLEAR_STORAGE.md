# Hướng Dẫn Clear Storage

## Bước 1: Stop Server (✅ Đã làm)

## Bước 2: Clear localStorage

Mở Console trong browser (F12) và chạy:

```javascript
localStorage.clear();
console.log('✅ localStorage cleared');
```

## Bước 3: Restart Server

Server sẽ được restart ngay...

## Bước 4: Reload Trang

Sau khi server khởi động xong, reload trang (F5)

## Bước 5: Đăng Nhập Lại

Đăng nhập với tài khoản của bạn để lấy token mới.

---

## Tại Sao Cần Làm Vậy?

1. **JWT_SECRET thay đổi**: Token cũ được tạo với secret cũ
2. **Server cần restart**: Để load JWT_SECRET mới từ .env
3. **localStorage cần clear**: Để xóa token cũ
4. **Đăng nhập lại**: Để lấy token mới với JWT_SECRET mới

## Kiểm Tra Token Mới

Sau khi đăng nhập, mở Console và chạy:

```javascript
const user = JSON.parse(localStorage.getItem('tutien2d_user'));
const payload = JSON.parse(atob(user.socketToken.split('.')[1]));
console.log('Token info:', {
    userId: payload.userId,
    username: payload.username,
    expires: new Date(payload.exp * 1000).toLocaleString()
});
```

Bạn sẽ thấy token mới với thời gian hết hạn 24 giờ từ bây giờ.
