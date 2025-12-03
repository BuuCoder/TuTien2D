# 🚀 Quick Start - Obfuscation System

## Cài Đặt Nhanh (5 phút)

### Bước 1: Cài Dependencies
```bash
npm install --save-dev javascript-obfuscator webpack-obfuscator cross-env
```

### Bước 2: Cấu Hình .env
```bash
# Copy template
copy .env.example .env

# Generate encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Paste key vào .env
# ENCRYPTION_KEY=<key-vừa-tạo>
```

### Bước 3: Test
```bash
node scripts/test-obfuscation.js
```

Kết quả mong đợi: `✓ All tests completed!`

### Bước 4: Run
```bash
# Development (không obfuscate)
npm run dev

# Production (có obfuscate)
npm run build:obfuscate
npm start
```

## ✅ Verification

Mở browser console → Network tab → Xem request body:

**Before**:
```json
{
  "userId": 123,
  "token": "abc123"
}
```

**After**:
```json
{
  "_": "rqm.=YjZB01QKkSJQUFUH4yLdtBUFhndDUFUNIgNXxxBLBzu3w8L"
}
```

## 📚 Đọc Thêm

- [Installation Guide](./INSTALLATION.md) - Chi tiết cài đặt
- [Obfuscation Guide](./docs/OBFUSCATION_GUIDE.md) - Hướng dẫn sử dụng
- [Task Completed](./TASK_COMPLETED.md) - Tóm tắt công việc

## 🆘 Troubleshooting

### Lỗi: Cannot find module
```bash
npm install --save-dev javascript-obfuscator webpack-obfuscator
```

### Lỗi: ENCRYPTION_KEY not found
```bash
# Tạo .env từ .env.example
copy .env.example .env

# Generate key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Lỗi: Deobfuscation failed
Kiểm tra SECRET_PATTERN trong:
- `lib/requestObfuscator.ts`
- `lib/deobfuscateMiddleware.js`

Phải giống nhau!

## 🎯 Done!

Hệ thống obfuscation đã sẵn sàng sử dụng!
