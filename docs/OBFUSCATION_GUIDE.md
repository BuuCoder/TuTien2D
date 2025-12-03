# Hướng Dẫn Mã Hóa & Obfuscation

## Tổng Quan

Hệ thống bảo mật 2 lớp:
1. **Request Obfuscation**: Mã hóa request body để khó đọc
2. **Code Obfuscation**: Mã hóa source code sau khi build

## 1. Request Obfuscation

### Cách Hoạt Động

Request body được mã hóa qua các bước:
1. JSON → Bytes
2. XOR với secret pattern
3. Thêm random padding
4. Base64 encode
5. Reverse string
6. Thêm checksum

### Sử dụng (Client-side)

```typescript
import { sendObfuscatedRequest } from '@/lib/requestObfuscator';

// Thay vì fetch thông thường
const response = await sendObfuscatedRequest('/api/endpoint', {
  userId: 123,
  data: 'sensitive'
});
```

### Giải Mã (Server-side)

```javascript
import { parseRequestBody } from '@/lib/deobfuscateMiddleware';

export async function POST(req) {
  // Tự động deobfuscate nếu có header X-Obfuscated
  const data = await parseRequestBody(req);
  
  // Xử lý data như bình thường
  console.log(data.userId);
}
```

### API Đã Được Bảo Vệ

- ✅ `/api/auth/login`
- ✅ `/api/auth/logout`
- ✅ `/api/player/get-stats`
- ✅ `/api/player/heal`
- ✅ `/api/player/use-skill`
- ✅ `/api/player/take-damage`
- ✅ `/api/player/update-stats`
- ✅ `/api/player/update-max-stats`
- ✅ `/api/player/add-gold`
- ✅ `/api/player/regen-mp`

## 2. Code Obfuscation

### Build Commands

```bash
# Development build (không obfuscate)
npm run build

# Production build (có obfuscate)
npm run build:obfuscate
```

### Cấu Hình

File: `next.config.obfuscate.js`

```javascript
const WebpackObfuscator = require('webpack-obfuscator');

module.exports = {
  webpack: (config, { isServer, dev }) => {
    if (!dev && !isServer) {
      config.plugins.push(
        new WebpackObfuscator({
          compact: true,
          controlFlowFlattening: true,
          deadCodeInjection: true,
          // ... các options khác
        })
      );
    }
    return config;
  }
};
```

### Post-Build Obfuscation

Script: `scripts/obfuscate-build.js`

Tự động obfuscate tất cả JS files trong `.next/static/chunks` sau khi build.

```bash
node scripts/obfuscate-build.js
```

## 3. Bảo Mật

### Secret Pattern

File: `lib/requestObfuscator.ts` và `lib/deobfuscateMiddleware.js`

```javascript
const SECRET_PATTERN = [0x4B, 0x69, 0x72, 0x6F, 0x32, 0x44]; // "Kiro2D"
```

⚠️ **QUAN TRỌNG**: Thay đổi secret pattern định kỳ!

### Encryption Key

File: `.env`

```env
ENCRYPTION_KEY=your-32-byte-hex-key-here
```

Generate key mới:
```javascript
const crypto = require('crypto');
console.log(crypto.randomBytes(32).toString('hex'));
```

## 4. Testing

### Test Request Obfuscation

```typescript
import { obfuscateRequest, deobfuscateRequest } from '@/lib/requestObfuscator';

const data = { userId: 123, token: 'abc' };
const obfuscated = obfuscateRequest(data);
console.log('Obfuscated:', obfuscated);

const deobfuscated = deobfuscateRequest(obfuscated);
console.log('Deobfuscated:', deobfuscated);
```

### Test Code Obfuscation

1. Build với obfuscation:
   ```bash
   npm run build:obfuscate
   ```

2. Kiểm tra file trong `.next/static/chunks/`
   - Code phải khó đọc
   - Biến được rename thành hex
   - String được encode

## 5. Performance

### Request Obfuscation

- Overhead: ~1-2ms per request
- Tăng kích thước request: ~30-40%

### Code Obfuscation

- Build time tăng: ~20-30%
- Bundle size tăng: ~15-25%
- Runtime performance: Không đáng kể

## 6. Troubleshooting

### Lỗi "Deobfuscation failed"

- Kiểm tra SECRET_PATTERN giống nhau client/server
- Kiểm tra header `X-Obfuscated` được gửi đúng
- Kiểm tra format request body: `{ _: "obfuscated_string" }`

### Lỗi "Invalid checksum"

- Request bị modify giữa chừng
- Hoặc SECRET_PATTERN không khớp

### Code Obfuscation Gây Lỗi

- Tắt `selfDefending` nếu cần debug
- Tắt `debugProtection` trong development
- Exclude files cụ thể trong config

## 7. Best Practices

1. **Chỉ obfuscate production builds**
2. **Thay đổi SECRET_PATTERN định kỳ**
3. **Backup code trước khi obfuscate**
4. **Test kỹ sau khi obfuscate**
5. **Monitor performance impact**
6. **Không commit ENCRYPTION_KEY lên git**

## 8. Maintenance

### Cập Nhật Secret Pattern

1. Thay đổi trong `lib/requestObfuscator.ts`
2. Thay đổi trong `lib/deobfuscateMiddleware.js`
3. Deploy cả client và server cùng lúc

### Thêm API Mới

```javascript
// API route
import { parseRequestBody } from '@/lib/deobfuscateMiddleware';

export async function POST(req) {
  const data = await parseRequestBody(req);
  // ...
}
```

```typescript
// Client
import { sendObfuscatedRequest } from '@/lib/requestObfuscator';

const response = await sendObfuscatedRequest('/api/new-endpoint', data);
```

## 9. Security Notes

- Request obfuscation **KHÔNG phải encryption**
- Chỉ làm khó đọc, không bảo mật tuyệt đối
- Vẫn cần HTTPS cho production
- Vẫn cần validate input ở server
- Code obfuscation chỉ làm chậm reverse engineering

## 10. Dependencies

```json
{
  "devDependencies": {
    "javascript-obfuscator": "^4.1.1",
    "webpack-obfuscator": "^3.5.1"
  }
}
```

Install:
```bash
npm install --save-dev javascript-obfuscator webpack-obfuscator
```
