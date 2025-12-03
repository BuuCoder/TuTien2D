# 🔐 How to Obfuscate Code

## 2 Loại Obfuscation

### 1. Request Body Obfuscation ✅
- **Khi nào**: Ngay lập tức (dev mode)
- **Ở đâu**: Runtime (khi app chạy)
- **Mã hóa gì**: Request body từ client → server
- **Cách kiểm tra**: Network tab → Request payload

### 2. Source Code Obfuscation ⏳
- **Khi nào**: Sau khi build production
- **Ở đâu**: Build time (khi tạo bundle)
- **Mã hóa gì**: JavaScript source code
- **Cách kiểm tra**: View source → .next/static/chunks/*.js

---

## 🔍 Kiểm Tra Request Obfuscation (Đã Có)

### Bước 1: Mở Network Tab
1. F12 → Network tab
2. Filter: Fetch/XHR

### Bước 2: Thực Hiện Action
- Login
- Talk to NPC
- Attack monster
- Use skill

### Bước 3: Kiểm Tra Request
**Mong đợi thấy**:
```json
POST /api/interact
{
  "_": "rqm.=YjZB01QKkSJQUFUH4yLdtBUFhndDUFUNIgNXxxBLBzu3w8L"
}
```

**KHÔNG phải**:
```json
{
  "npcId": "merchant",
  "action": "talk"
}
```

---

## 🏗️ Build Code Obfuscation (Chưa Có)

### Bước 1: Cài Dependencies
```bash
npm install --save-dev javascript-obfuscator webpack-obfuscator
```

### Bước 2: Build Production
```bash
npm run build:obfuscate
```

Lệnh này sẽ:
1. Build Next.js production
2. Obfuscate tất cả JS files trong `.next/static/chunks/`

### Bước 3: Start Production Server
```bash
npm start
```

### Bước 4: Kiểm Tra Source Code

#### Option A: View Source
1. Mở browser
2. Right-click → View Page Source
3. Tìm `<script src="/_next/static/chunks/...js">`
4. Click vào link
5. Xem code đã được obfuscate

#### Option B: Check Files
```bash
# Mở file trong .next/static/chunks/
notepad .next/static/chunks/app-pages-browser_*.js
```

**Mong đợi thấy**:
```javascript
var _0x1a2b=['login','fetch','/api/auth/login'];
function _0x3c4d(_0x5e6f,_0x7g8h){
  return _0x1a2b[1](_0x1a2b[2],{
    body:JSON[_0x1a2b[3]]({_:_0x9i0j(_0x5e6f,_0x7g8h)})
  });
}
```

**KHÔNG phải**:
```javascript
function login(username, password) {
  return fetch('/api/auth/login', {
    body: JSON.stringify({ username, password })
  });
}
```

---

## 📊 So Sánh Dev vs Production

| Feature | Dev Mode | Production Build |
|---------|----------|------------------|
| **Request Obfuscation** | ✅ Có | ✅ Có |
| **Code Obfuscation** | ❌ Không | ✅ Có (sau build:obfuscate) |
| **Debug** | ✅ Dễ | ❌ Khó |
| **Performance** | ⚡ Nhanh | ⚡ Nhanh |
| **Security** | ⚠️ Trung bình | ✅ Cao |

---

## 🎯 Hiện Tại Của Bạn

### ✅ Đã Có
- Request body obfuscation (tất cả API)
- Server-side deobfuscation
- JWT authentication
- Rate limiting

### ⏳ Chưa Có
- Code obfuscation (cần build production)

### 📝 Để Có Code Obfuscation

```bash
# 1. Cài dependencies
npm install --save-dev javascript-obfuscator webpack-obfuscator

# 2. Build với obfuscation
npm run build:obfuscate

# 3. Start production
npm start

# 4. Kiểm tra source code trong browser
```

---

## 🔍 Tại Sao Code Chưa Obfuscate?

### Nguyên Nhân
Bạn đang chạy **development mode** (`npm run dev`):
- Next.js không build code
- Code được serve trực tiếp từ source
- Không có obfuscation

### Giải Pháp
Chạy **production mode**:
```bash
npm run build:obfuscate  # Build + obfuscate
npm start                # Run production
```

---

## 📂 Nơi Tìm Code Obfuscated

### Development Mode (npm run dev)
```
❌ Không có obfuscation
Source code: components/*.tsx, lib/*.ts
Browser: Readable code
```

### Production Mode (npm run build:obfuscate)
```
✅ Có obfuscation
Build output: .next/static/chunks/*.js
Browser: Obfuscated code
```

### Ví Dụ Đường Dẫn
```
.next/
├── static/
│   └── chunks/
│       ├── app-pages-browser_*.js      ← Obfuscated
│       ├── webpack-*.js                ← Obfuscated
│       └── [id]-*.js                   ← Obfuscated
```

---

## ⚠️ Lưu Ý Quan Trọng

### Request Obfuscation
- ✅ Hoạt động ngay (dev + production)
- ✅ Không cần build
- ✅ Kiểm tra trong Network tab

### Code Obfuscation
- ⏳ Chỉ sau khi build production
- ⏳ Cần cài dependencies
- ⏳ Kiểm tra trong View Source

---

## 🎯 Checklist

### Request Obfuscation ✅
- [x] Implemented
- [x] Working in dev mode
- [x] All API endpoints protected
- [x] Test: Network tab shows obfuscated body

### Code Obfuscation ⏳
- [ ] Install dependencies
- [ ] Run build:obfuscate
- [ ] Start production server
- [ ] Test: View source shows obfuscated code

---

## 🚀 Quick Commands

```bash
# Check request obfuscation (works now)
npm run dev
# → Open browser → Network tab → See obfuscated requests

# Enable code obfuscation (need to build)
npm install --save-dev javascript-obfuscator webpack-obfuscator
npm run build:obfuscate
npm start
# → View source → See obfuscated code
```

---

**TL;DR**: 
- **Request obfuscation**: ✅ Đã có (test ngay)
- **Code obfuscation**: ⏳ Cần build production
