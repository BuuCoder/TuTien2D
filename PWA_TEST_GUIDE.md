# PWA Test Guide - Hướng dẫn test PWA

## 📱 PWA Install Button

### ✅ Đã thêm:
- Component `PWAInstallButton.tsx`
- Hiển thị button "📱 Cài đặt App" ở góc dưới phải
- Auto-detect khi có thể install
- Ẩn khi đã cài đặt

## 🧪 Cách Test PWA

### 1. Build Production:
```bash
npm run build
npm start
```

### 2. Mở Browser:
```
http://localhost:3000
```

### 3. Kiểm tra Service Worker:

**Chrome DevTools:**
1. F12 > Application tab
2. Service Workers section
3. Check "sw.js" status: ✅ Activated

**Console logs:**
```
[PWA] Service Worker registered: /
[PWA] Install prompt available
```

### 4. Test Install Button:

#### Desktop (Chrome/Edge):
- Button "📱 Cài đặt App" xuất hiện góc dưới phải
- Click button
- Dialog "Install Tu Tiên 2D?" xuất hiện
- Click "Install"
- App mở trong cửa sổ riêng (standalone)

#### Mobile (Chrome Android):
- Button "📱 Cài đặt App" xuất hiện
- Hoặc banner "Add to Home Screen" tự động
- Click install
- Icon xuất hiện trên home screen
- Tap icon → App mở fullscreen

#### iOS (Safari):
- Không có auto-prompt
- Manual: Share button > "Add to Home Screen"
- Icon xuất hiện trên home screen

### 5. Test Offline Mode:

**Sau khi install:**
1. F12 > Network tab
2. Check "Offline" checkbox
3. Reload page
4. App vẫn chạy! ✅

**Hoặc:**
1. Disconnect WiFi
2. Mở app
3. Vẫn load được cached assets

### 6. Test Update:

**Khi có update:**
1. Deploy code mới
2. User mở app
3. Alert: "Có phiên bản mới! Reload để cập nhật?"
4. Click OK → App reload với code mới

## 🎯 Expected Behavior

### Install Button States:

#### 1. Not Installable (Hidden):
- Đã cài đặt rồi
- Hoặc browser không support PWA
- Hoặc không đủ điều kiện (cần HTTPS)

#### 2. Installable (Visible):
```
┌─────────────────────┐
│ 📱 Cài đặt App      │
└─────────────────────┘
```
- Button màu xanh
- Pulse animation
- Hover effect

#### 3. Installed (Green badge):
```
┌─────────────────────┐
│ ✅ App đã cài đặt   │
└─────────────────────┘
```
- Badge màu xanh lá
- Không thể click

### Service Worker Logs:

```javascript
// Registration
[PWA] Service Worker registered: /

// Install prompt
[PWA] Install prompt available

// User action
[PWA] User choice: accepted
[PWA] User accepted install

// Installed
[PWA] App installed
```

## 🐛 Troubleshooting

### Button không xuất hiện:

**Nguyên nhân:**
1. Đã cài đặt rồi
2. Không dùng HTTPS (localhost OK)
3. Browser không support
4. Manifest.json lỗi

**Giải pháp:**
```bash
# Check console
F12 > Console

# Check manifest
F12 > Application > Manifest

# Check service worker
F12 > Application > Service Workers
```

### Install không work:

**Nguyên nhân:**
1. Icons không tồn tại
2. Manifest.json sai format
3. Service worker chưa active

**Giải pháp:**
```bash
# Clear cache
F12 > Application > Clear storage > Clear site data

# Rebuild
npm run build
npm start
```

### Offline không work:

**Nguyên nhân:**
1. Service worker chưa cache assets
2. API calls không có fallback

**Giải pháp:**
```javascript
// Check cache
F12 > Application > Cache Storage
// Should see: tutien2d-static-v1, tutien2d-dynamic-v1

// Check cached files
Click on cache name > See list of cached URLs
```

## 📊 PWA Checklist

### Before Testing:
- [ ] Build production: `npm run build`
- [ ] Start server: `npm start`
- [ ] Open http://localhost:3000
- [ ] Check console for errors

### During Testing:
- [ ] Service worker registered
- [ ] Install button appears
- [ ] Click install works
- [ ] App opens standalone
- [ ] Offline mode works
- [ ] Update detection works

### After Install:
- [ ] Icon on home screen/desktop
- [ ] App opens without browser UI
- [ ] Splash screen shows
- [ ] Theme color correct
- [ ] Offline caching works

## 🎨 Customization

### Change button position:
```tsx
// components/PWAInstallButton.tsx
style={{
  bottom: '20px',  // Change this
  right: '20px',   // Change this
}}
```

### Change button style:
```tsx
backgroundColor: 'rgba(59, 130, 246, 0.95)',  // Blue
// Or
backgroundColor: 'rgba(16, 185, 129, 0.95)',  // Green
```

### Hide button after X seconds:
```tsx
useEffect(() => {
  const timer = setTimeout(() => {
    setIsInstallable(false);
  }, 30000); // Hide after 30s
  return () => clearTimeout(timer);
}, []);
```

## 🚀 Deploy

### Vercel/Netlify:
```bash
git push
# PWA tự động work với HTTPS
```

### Custom Server:
```bash
# Cần HTTPS
# Service worker chỉ work trên HTTPS hoặc localhost
```

## 🎉 Success Criteria

PWA hoạt động đúng khi:
- ✅ Install button xuất hiện
- ✅ Click install thành công
- ✅ App mở standalone mode
- ✅ Offline mode hoạt động
- ✅ Update detection work
- ✅ Icon trên home screen

---

**Quick Test:**
```bash
npm run build && npm start
# Mở http://localhost:3000
# Click "📱 Cài đặt App"
# Done! 🎉
```
