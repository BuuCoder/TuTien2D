# Installation Guide - Obfuscation System

## Bước 1: Cài Đặt Dependencies

```bash
npm install --save-dev javascript-obfuscator webpack-obfuscator cross-env
```

**Note**: 
- `javascript-obfuscator` & `webpack-obfuscator`: Mã hóa code
- `cross-env`: Tương thích Windows/Linux/Mac cho environment variables

## Bước 2: Cấu Hình Environment

1. Copy `.env.example` thành `.env`:
```bash
copy .env.example .env
```

2. Generate encryption key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

3. Cập nhật `.env` với key vừa tạo:
```env
ENCRYPTION_KEY=your-generated-key-here
```

## Bước 3: Test Obfuscation

```bash
node scripts/test-obfuscation.js
```

Kết quả mong đợi:
```
============================================================
Testing Request Obfuscation
============================================================

Test 1: Simple Object
Original: { userId: 123, token: 'abc123' }
Obfuscated: rqm.=YjZB01QKkSJQUFUH4yLdtBUFhndDUFUNIgNXxxBLBzu3w8L
Match: ✓

...

✓ All tests completed!
============================================================
```

## Bước 4: Build & Test

### Development Build (không obfuscate)
```bash
npm run build
npm start
```

### Production Build (có obfuscate)
```bash
npm run build:obfuscate
npm start
```

## Bước 5: Verify

1. Mở browser console
2. Kiểm tra Network tab
3. Xem request body đã được obfuscate:
   ```json
   {
     "_": "rqm.=YjZB01QKkSJQUFUH4yLdtBUFhndDUFUNIgNXxxBLBzu3w8L"
   }
   ```

4. Kiểm tra response vẫn hoạt động bình thường

## Troubleshooting

### Lỗi: "Cannot find module 'javascript-obfuscator'"

**Giải pháp**:
```bash
npm install --save-dev javascript-obfuscator webpack-obfuscator
```

### Lỗi: "ENCRYPTION_KEY not found"

**Giải pháp**:
1. Tạo file `.env` từ `.env.example`
2. Generate key và thêm vào `.env`

### Lỗi: "Deobfuscation failed"

**Nguyên nhân**: SECRET_PATTERN không khớp giữa client và server

**Giải pháp**:
1. Kiểm tra `lib/requestObfuscator.ts`
2. Kiểm tra `lib/deobfuscateMiddleware.js`
3. Đảm bảo SECRET_PATTERN giống nhau

### Build Obfuscate Chậm

**Bình thường**: Build với obfuscation tăng ~20-30% thời gian

**Giải pháp**:
- Chỉ dùng `build:obfuscate` cho production
- Dùng `build` thông thường cho development

## Verification Checklist

- [ ] Dependencies đã cài đặt
- [ ] `.env` đã được cấu hình
- [ ] Test obfuscation pass
- [ ] Development build hoạt động
- [ ] Production build hoạt động
- [ ] Request body được obfuscate
- [ ] API responses đúng
- [ ] Login/logout hoạt động
- [ ] Combat actions hoạt động
- [ ] MP regeneration hoạt động

## Next Steps

Sau khi cài đặt thành công:

1. Đọc [Obfuscation Guide](./docs/OBFUSCATION_GUIDE.md)
2. Xem [Implementation Summary](./docs/OBFUSCATION_IMPLEMENTATION.md)
3. Deploy lên production

## Support

Nếu gặp vấn đề:
1. Kiểm tra logs trong console
2. Xem [Troubleshooting Guide](./docs/OBFUSCATION_GUIDE.md#troubleshooting)
3. Chạy test: `node scripts/test-obfuscation.js`
