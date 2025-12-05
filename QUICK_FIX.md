# Quick Fix - Server Chậm

## Bước 1: Chạy SQL để thêm indexes (QUAN TRỌNG NHẤT!)

```bash
mysql -u root -p tutien_2d < database/add_indexes.sql
```

Hoặc copy nội dung file `database/add_indexes.sql` và chạy trong MySQL Workbench.

## Bước 2: Restart server

```bash
npm run dev
```

## Bước 3: Monitor performance

Mở terminal mới và chạy:

```bash
npm run monitor
```

## Bước 4: Test

1. Đăng nhập vào game
2. Chat trong game
3. Đánh monsters
4. Kiểm tra xem có nhanh hơn không

## Kết quả mong đợi:

- ✅ Chat messages load nhanh hơn (có index)
- ✅ Attack monsters mượt hơn (có cache)
- ✅ Ít lag hơn khi nhiều người chơi (optimize broadcast)
- ✅ Server ổn định hơn (connection pool lớn hơn)

## Nếu vẫn chậm:

1. Kiểm tra `npm run monitor` xem CPU/Memory có cao không
2. Kiểm tra database có chạy trên cùng máy không (nên dùng local DB)
3. Kiểm tra network latency (ping)
4. Xem log có error gì không

## Files đã thay đổi:

- ✅ `lib/db.js` - Tăng connection pool
- ✅ `lib/rateLimiter.js` - Cleanup tốt hơn
- ✅ `lib/cache.js` - Cache layer mới
- ✅ `server.js` - Optimize broadcast, thêm cache, Socket.IO config
- ✅ `database/add_indexes.sql` - Indexes cho database
- ✅ `scripts/monitor-performance.js` - Monitor tool
