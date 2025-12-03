# 🪟 Windows Setup Guide

## Vấn Đề Với Windows

Windows sử dụng cú pháp khác cho environment variables:

### ❌ Không Hoạt Động Trên Windows
```bash
NODE_ENV=production node server.js
```

### ✅ Giải Pháp

#### Option 1: Sử dụng cross-env (Khuyến nghị)
```bash
# Cài đặt
npm install --save-dev cross-env

# Sử dụng
cross-env NODE_ENV=production node server.js
```

**Ưu điểm**: Tương thích cả Windows, Linux, Mac

#### Option 2: Cú pháp Windows thuần
```bash
# CMD
set NODE_ENV=production && node server.js

# PowerShell
$env:NODE_ENV="production"; node server.js
```

**Nhược điểm**: Chỉ hoạt động trên Windows

## 🔧 Đã Cập Nhật

### package.json Scripts

```json
{
  "scripts": {
    "dev": "node server.js",
    "build": "next build",
    "build:obfuscate": "next build && node scripts/obfuscate-build.js",
    "start": "cross-env NODE_ENV=production node server.js",
    "lint": "eslint"
  }
}
```

## 📦 Cài Đặt

```bash
# Cài tất cả dependencies
npm install

# Hoặc chỉ cài cross-env
npm install --save-dev cross-env
```

## 🚀 Sử dụng

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
# Hoặc với obfuscation
npm run build:obfuscate
npm start
```

## ⚠️ Lưu Ý

### PowerShell vs CMD

**CMD (Command Prompt)**:
```cmd
set NODE_ENV=production && node server.js
```

**PowerShell**:
```powershell
$env:NODE_ENV="production"; node server.js
```

**cross-env (Tất cả)**:
```bash
cross-env NODE_ENV=production node server.js
```

### Khuyến Nghị

✅ **Sử dụng cross-env** để:
- Tương thích đa nền tảng
- Dễ share code với team
- Không lo lắng về shell khác nhau

## 🐛 Troubleshooting

### Lỗi: 'NODE_ENV' is not recognized

**Nguyên nhân**: Đang dùng cú pháp Linux/Mac trên Windows

**Giải pháp**:
```bash
npm install --save-dev cross-env
npm start
```

### Lỗi: cross-env not found

**Nguyên nhân**: Chưa cài cross-env

**Giải pháp**:
```bash
npm install --save-dev cross-env
```

### Lỗi: Permission denied

**Nguyên nhân**: PowerShell execution policy

**Giải pháp**:
```powershell
# Chạy PowerShell as Administrator
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## 📝 Dependencies Cần Thiết

```json
{
  "devDependencies": {
    "cross-env": "^7.0.3",
    "javascript-obfuscator": "^4.1.1",
    "webpack-obfuscator": "^3.5.1"
  }
}
```

## ✅ Checklist

- [ ] Cài đặt cross-env: `npm install --save-dev cross-env`
- [ ] Test dev mode: `npm run dev`
- [ ] Test build: `npm run build`
- [ ] Test production: `npm start`
- [ ] Verify không có lỗi NODE_ENV

## 🎯 Kết Quả

Sau khi cài cross-env, tất cả scripts sẽ hoạt động bình thường trên Windows:

```bash
npm run dev      # ✅ Works
npm run build    # ✅ Works
npm start        # ✅ Works (với cross-env)
```

---

**Platform**: Windows 10/11
**Shell**: CMD, PowerShell, Git Bash
**Solution**: cross-env package
