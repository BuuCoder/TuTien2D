This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## TuTien 2D - Multiplayer Game

Game nhập vai 2D với hệ thống combat, multiplayer và PK.

### Security Update (Latest)

Hệ thống đã được cập nhật với bảo mật 2 lớp:

#### 1. Server-Side Validation
- ✅ HP/Mana được validate và quản lý hoàn toàn ở server-side
- ✅ Mọi action (heal, attack, take damage) đều được validate từ database
- ✅ JWT token authentication cho mọi API request
- ✅ Rate limiting và anti-cheat validation
- ✅ Request ID system để ngăn duplicate requests

#### 2. Code & Request Obfuscation
- ✅ Request body được mã hóa (XOR + Base64 + Checksum)
- ✅ Source code được obfuscate sau khi build production
- ✅ Tự động deobfuscate ở server-side
- ✅ Khó reverse engineer và modify requests

**Xem thêm:**
- [API Security Documentation](./docs/API_SECURITY.md)
- [Obfuscation Guide](./docs/OBFUSCATION_GUIDE.md)
- [Migration Guide](./docs/MIGRATION_GUIDE.md)

## Getting Started

### 1. Cài Đặt Dependencies

```bash
npm install
```

### 2. Cấu Hình Environment

Copy `.env.example` thành `.env` và cấu hình:

```bash
cp .env.example .env
```

Tạo encryption key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Chạy Development Server

```bash
npm run dev
```

### 4. Build Production

```bash
# Build thông thường (không obfuscate)
npm run build

# Build với obfuscation (production)
npm run build:obfuscate
```

Open [http://localhost:4004](http://localhost:4004) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
