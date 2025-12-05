# Fix Lỗi: Getter must be a function

## Nguyên nhân
Service Worker đang cache các file turbopack cũ bị lỗi. Khi build lại, browser vẫn load file cũ từ cache.

## Giải pháp

### Bước 1: Clear cache trên server
```bash
# Xóa build cũ
rmdir /s /q .next

# Build lại
npm run build
```

### Bước 2: Clear cache trên browser (QUAN TRỌNG!)

**Cách 1: Dùng tool có sẵn**
1. Truy cập: `http://your-domain.com/clear-cache.html`
2. Click "Clear & Reload Game"

**Cách 2: Manual**
1. Mở DevTools (F12)
2. Application tab → Storage → Clear site data
3. Hoặc: Right-click Reload → Empty Cache and Hard Reload

**Cách 3: Unregister Service Worker**
1. DevTools → Application → Service Workers
2. Click "Unregister" cho tất cả service workers
3. Reload trang

### Bước 3: Test
```bash
node server.js
```

Truy cập game, lỗi sẽ biến mất.

## Đã fix gì?

### 1. Service Worker (public/sw.js)
- ✅ Tăng CACHE_VERSION lên 2 để force clear cache cũ
- ✅ Skip cache cho `/_next/static/chunks/` - luôn fetch fresh
- ✅ Tự động xóa cache cũ khi activate

### 2. Clear Cache Tool (public/clear-cache.html)
- ✅ Tool để user tự clear cache
- ✅ Unregister service worker
- ✅ Clear localStorage/sessionStorage

## Lưu ý cho production

### Khi deploy version mới:
1. Tăng `CACHE_VERSION` trong `public/sw.js`
2. Build: `npm run build`
3. Thông báo user reload hoặc clear cache

### Tránh cache lỗi:
- Next.js chunks: KHÔNG cache (đã fix)
- API routes: KHÔNG cache (đã có)
- Static assets: Cache OK
- Images/fonts: Cache OK

## Debug

### Kiểm tra cache hiện tại:
```javascript
// Trong DevTools Console
caches.keys().then(console.log)
```

### Kiểm tra Service Worker:
```javascript
navigator.serviceWorker.getRegistrations().then(console.log)
```

### Force reload không cache:
- Windows: `Ctrl + Shift + R`
- Mac: `Cmd + Shift + R`
