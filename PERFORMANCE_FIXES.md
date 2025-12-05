# Các vấn đề Performance và Cách Fix

## Vấn đề đã phát hiện:

### 1. Database Connection Pool quá nhỏ ✅ FIXED
- **Vấn đề**: `connectionLimit: 10` quá ít cho multiplayer game
- **Fix**: Tăng lên 50 connections trong `lib/db.js`
- **Impact**: Giảm thời gian chờ database queries

### 2. Thiếu Database Indexes ⚠️ CẦN CHẠY SQL
- **Vấn đề**: Queries chậm do không có indexes
- **Fix**: Chạy file `database/add_indexes.sql`
- **Cách chạy**:
  ```bash
  mysql -u root -p tutien_2d < database/add_indexes.sql
  ```
- **Impact**: Tăng tốc queries lên 10-100 lần

### 3. Chat broadcast không hiệu quả ✅ FIXED
- **Vấn đề**: Loop qua TẤT CẢ sockets thay vì chỉ channel hiện tại
- **Fix**: Chỉ loop qua players trong channel
- **Impact**: Giảm CPU usage khi có nhiều người chơi

### 4. Rate Limiter cleanup chậm ✅ FIXED
- **Vấn đề**: Cleanup chỉ chạy 5 phút/lần
- **Fix**: Chạy mỗi 1 phút và xóa entries cũ hơn 5 phút
- **Impact**: Giảm memory usage

### 5. Không có caching ✅ FIXED
- **Vấn đề**: Mỗi lần attack monster phải query DB
- **Fix**: Thêm cache layer cho user stats (2 phút TTL)
- **Impact**: Giảm database load đáng kể

## Các vấn đề khác cần kiểm tra:

### 6. Socket.IO Configuration
Thêm vào `server.js` để optimize:
```javascript
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    // Thêm các options này:
    pingTimeout: 60000,
    pingInterval: 25000,
    upgradeTimeout: 30000,
    maxHttpBufferSize: 1e6, // 1MB
    transports: ['websocket', 'polling']
});
```

### 7. Monster State Memory
- Hiện tại: 3 channels × tất cả monsters = nhiều memory
- Cân nhắc: Chỉ load monsters khi có player ở map đó

### 8. Logging
- Quá nhiều `console.log` có thể làm chậm server
- Cân nhắc: Dùng logging library với levels (error, warn, info, debug)

### 9. Environment Variables
Kiểm tra `.env`:
```env
NODE_ENV=production
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=your_password
DB_NAME=tutien_2d
PORT=4004
```

## Cách test performance:

### 1. Kiểm tra database queries:
```sql
-- Enable slow query log
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 0.5; -- Log queries > 0.5s

-- Xem slow queries
SHOW VARIABLES LIKE 'slow_query_log_file';
```

### 2. Monitor server:
```bash
# CPU và Memory usage
node --inspect server.js

# Hoặc dùng PM2
npm install -g pm2
pm2 start server.js --name tutien-server
pm2 monit
```

### 3. Load testing:
```bash
# Install artillery
npm install -g artillery

# Test với 100 concurrent users
artillery quick --count 100 --num 10 http://localhost:4004
```

## Checklist:

- [x] Tăng database connection pool
- [x] Optimize chat broadcast
- [x] Improve rate limiter cleanup
- [x] Add caching layer
- [ ] Chạy SQL để thêm indexes
- [ ] Optimize Socket.IO config
- [ ] Giảm logging trong production
- [ ] Monitor server performance

## Kết quả mong đợi:

- Database queries: **10-100x nhanh hơn** (với indexes)
- Chat broadcast: **5-10x nhanh hơn** (optimize loop)
- Memory usage: **Giảm 20-30%** (cache + cleanup)
- Overall latency: **Giảm 50-70%**
