# Security Validation - Skin System

## Tổng Quan

Tài liệu này mô tả các biện pháp security validation đã được implement trong hệ thống skin để bảo vệ khỏi các cuộc tấn công và manipulation từ phía client.

## ⚠️ Nguyên Tắc Quan Trọng

**NEVER TRUST THE CLIENT!**

Client-side validation chỉ là để cải thiện UX, KHÔNG phải để bảo vệ security. Mọi validation quan trọng PHẢI được thực hiện ở server-side.

## 🛡️ Security Layers

### Layer 1: Client-Side Validation (UX Only)
- ✅ Check ownership
- ✅ Check gold balance
- ✅ Confirmation dialog
- ⚠️ **CÓ THỂ BỊ BYPASS** bằng cách modify code trong browser

### Layer 2: Server-Side Validation (Security)
- ✅ Token authentication
- ✅ Token data verification
- ✅ Ownership verification
- ✅ Gold balance verification
- ✅ Transaction atomicity
- ✅ Race condition prevention
- 🔒 **KHÔNG THỂ BYPASS** (nếu implement đúng)

## 🔐 API Security Validations

### 1. `/api/skin/buy` - Mua Skin

#### Validations Implemented

##### A. Input Validation
```typescript
// Check required fields
if (!userId || !sessionId || !token || !skinId) {
    return error('Thiếu thông tin bắt buộc');
}
```

##### B. Authentication
```typescript
// Verify JWT token
const tokenResult = verifyToken(token);
if (!tokenResult.valid) {
    return error('Token không hợp lệ');
}

// Verify token data matches request
if (tokenData.userId !== userId || tokenData.sessionId !== sessionId) {
    return error('Thông tin xác thực không khớp');
}
```

##### C. Business Logic Validation
```typescript
// Check skin exists
if (!SKINS[skinId]) {
    return error('Skin không tồn tại');
}

// Check skin is not default
if (skin.isDefault) {
    return error('Không thể mua skin mặc định');
}

// Check ownership
const [existingSkin] = await db.query(
    'SELECT * FROM user_skin WHERE user_id = ? AND skin_id = ?',
    [userId, skinId]
);
if (existingSkin.length > 0) {
    return error('Bạn đã sở hữu trang phục này!');
}

// Check gold balance
if (currentGold < skin.price) {
    return error('Không đủ vàng!');
}
```

##### D. Transaction Safety
```typescript
// Use database transaction
await connection.beginTransaction();

// Deduct gold with additional check (prevent race condition)
const [updateResult] = await connection.query(
    'UPDATE user_inventory SET gold = gold - ? WHERE user_id = ? AND gold >= ?',
    [skin.price, userId, skin.price]
);

// Verify update was successful
if (updateResult.affectedRows === 0) {
    await connection.rollback();
    return error('Giao dịch thất bại');
}

// Add skin
await connection.query(
    'INSERT INTO user_skin (user_id, skin_id) VALUES (?, ?)',
    [userId, skinId]
);

// Commit transaction
await connection.commit();
```

### 2. `/api/skin/equip` - Trang Bị Skin

#### Validations Implemented

##### A. Input Validation
```typescript
if (!userId || !sessionId || !token || !skinId) {
    return error('Thiếu thông tin bắt buộc');
}
```

##### B. Authentication
```typescript
// Same as buy API
```

##### C. Ownership Verification
```typescript
// Check if user owns this skin
const [ownedSkin] = await db.query(
    'SELECT * FROM user_skin WHERE user_id = ? AND skin_id = ?',
    [userId, skinId]
);
if (ownedSkin.length === 0) {
    return error('Bạn chưa sở hữu trang phục này!');
}
```

##### D. Atomic Update with Verification
```typescript
// Update with additional verification in SQL
const [updateResult] = await db.query(
    'UPDATE users SET skin = ? WHERE id = ? AND EXISTS (SELECT 1 FROM user_skin WHERE user_id = ? AND skin_id = ?)',
    [skinId, userId, userId, skinId]
);

// Verify update was successful
if (updateResult.affectedRows === 0) {
    console.warn(`[Security] User ${userId} tried to equip unowned skin ${skinId}`);
    return error('Không thể trang bị skin này');
}
```

### 3. `/api/skin/list` - Danh Sách Skin

#### Validations Implemented

##### A. Input Validation
```typescript
if (!userId || !sessionId || !token) {
    return error('Thiếu thông tin bắt buộc');
}
```

##### B. Authentication
```typescript
// Same as other APIs
```

##### C. Data Filtering
```typescript
// Only return data for authenticated user
// No sensitive information exposed
```

## 🚨 Attack Scenarios & Protections

### Scenario 1: Bypass Client Validation
**Attack**: User modifies JavaScript code để bypass client-side checks

**Protection**:
- ✅ Server validates everything again
- ✅ Token authentication prevents unauthorized access
- ✅ Database checks ownership and gold

**Result**: ❌ Attack FAILED

### Scenario 2: Replay Attack
**Attack**: User captures và replay request để mua skin nhiều lần

**Protection**:
- ✅ Database UNIQUE constraint trên (user_id, skin_id)
- ✅ Transaction rollback nếu duplicate
- ✅ Error handling cho duplicate entry

**Result**: ❌ Attack FAILED

### Scenario 3: Race Condition
**Attack**: User gửi nhiều requests đồng thời để exploit timing

**Protection**:
- ✅ Database transaction với BEGIN/COMMIT
- ✅ UPDATE với condition `WHERE gold >= ?`
- ✅ Check affectedRows sau UPDATE

**Result**: ❌ Attack FAILED

### Scenario 4: Token Manipulation
**Attack**: User modifies token để impersonate khác user

**Protection**:
- ✅ JWT signature verification
- ✅ Token data verification (userId, sessionId)
- ✅ Token expiration check

**Result**: ❌ Attack FAILED

### Scenario 5: SQL Injection
**Attack**: User inject SQL code qua parameters

**Protection**:
- ✅ Parameterized queries (prepared statements)
- ✅ No string concatenation trong SQL
- ✅ Input validation

**Result**: ❌ Attack FAILED

### Scenario 6: Price Manipulation
**Attack**: User gửi request với giá thấp hơn

**Protection**:
- ✅ Server lấy giá từ SKINS constant (server-side)
- ✅ KHÔNG trust giá từ client
- ✅ Validate với database gold balance

**Result**: ❌ Attack FAILED

### Scenario 7: Negative Gold Exploit
**Attack**: User cố gắng mua skin khi gold âm

**Protection**:
- ✅ Check `gold >= price` trước khi UPDATE
- ✅ UPDATE với condition `WHERE gold >= ?`
- ✅ Rollback nếu affectedRows = 0

**Result**: ❌ Attack FAILED

## 📊 Security Checklist

### Authentication & Authorization
- [x] JWT token verification
- [x] Token data validation
- [x] User ID verification
- [x] Session ID verification

### Input Validation
- [x] Required fields check
- [x] Data type validation
- [x] Skin ID validation
- [x] User ID validation

### Business Logic
- [x] Ownership verification
- [x] Gold balance check
- [x] Skin existence check
- [x] Default skin protection

### Database Security
- [x] Parameterized queries
- [x] Transaction support
- [x] UNIQUE constraints
- [x] Foreign key constraints
- [x] Race condition prevention

### Error Handling
- [x] Generic error messages (no sensitive info)
- [x] Security event logging
- [x] Transaction rollback
- [x] Duplicate entry handling

### Monitoring & Logging
- [x] Security warnings logged
- [x] Failed attempts tracked
- [x] Error details logged (server-side only)

## 🔍 Security Testing

### Manual Testing

#### Test 1: Bypass Client Validation
```javascript
// In browser console
fetch('/api/skin/buy', {
    method: 'POST',
    body: JSON.stringify({
        userId: 1,
        skinId: 'warrior',
        // Missing token
    })
});
// Expected: 401 Unauthorized
```

#### Test 2: Fake Token
```javascript
fetch('/api/skin/buy', {
    method: 'POST',
    body: JSON.stringify({
        userId: 1,
        skinId: 'warrior',
        token: 'fake-token-123'
    })
});
// Expected: 401 Token không hợp lệ
```

#### Test 3: Buy Twice
```javascript
// Buy same skin twice
await buySkin('warrior');
await buySkin('warrior');
// Expected: Second call returns "Đã sở hữu"
```

#### Test 4: Insufficient Gold
```javascript
// Try to buy expensive skin with low gold
await buySkin('dragon_knight'); // 20,000 gold
// Expected: "Không đủ vàng"
```

### Automated Testing

```typescript
describe('Skin API Security', () => {
    test('should reject request without token', async () => {
        const response = await request(app)
            .post('/api/skin/buy')
            .send({ userId: 1, skinId: 'warrior' });
        expect(response.status).toBe(401);
    });

    test('should reject invalid token', async () => {
        const response = await request(app)
            .post('/api/skin/buy')
            .send({ userId: 1, skinId: 'warrior', token: 'fake' });
        expect(response.status).toBe(401);
    });

    test('should prevent buying same skin twice', async () => {
        await buySkin(validToken, 'warrior');
        const response = await buySkin(validToken, 'warrior');
        expect(response.body.error).toContain('đã sở hữu');
    });

    test('should prevent buying with insufficient gold', async () => {
        const response = await buySkin(lowGoldToken, 'dragon_knight');
        expect(response.body.error).toContain('Không đủ vàng');
    });
});
```

## 🎯 Best Practices Applied

1. **Defense in Depth**: Multiple layers of validation
2. **Least Privilege**: Only necessary permissions
3. **Fail Secure**: Default to deny on errors
4. **Input Validation**: Validate all inputs
5. **Output Encoding**: Safe error messages
6. **Logging**: Track security events
7. **Transaction Safety**: Atomic operations
8. **Error Handling**: Graceful degradation

## 📝 Security Maintenance

### Regular Tasks
- [ ] Review security logs weekly
- [ ] Update dependencies monthly
- [ ] Audit code for vulnerabilities quarterly
- [ ] Penetration testing annually

### Monitoring
- [ ] Failed authentication attempts
- [ ] Suspicious transaction patterns
- [ ] Duplicate purchase attempts
- [ ] Race condition occurrences

## 🚀 Future Improvements

- [ ] Rate limiting per user
- [ ] IP-based rate limiting
- [ ] CAPTCHA for suspicious activity
- [ ] Two-factor authentication
- [ ] Audit trail for all transactions
- [ ] Real-time fraud detection
- [ ] Automated security testing in CI/CD

## 📚 References

- OWASP Top 10
- JWT Best Practices
- SQL Injection Prevention
- Race Condition Prevention
- Transaction Management

## ✅ Conclusion

Hệ thống skin đã được implement với đầy đủ security validations:

- ✅ **Authentication**: JWT token verification
- ✅ **Authorization**: Ownership checks
- ✅ **Input Validation**: All inputs validated
- ✅ **Business Logic**: All rules enforced
- ✅ **Transaction Safety**: Atomic operations
- ✅ **Error Handling**: Secure error messages
- ✅ **Logging**: Security events tracked

**Client-side validation** = UX improvement
**Server-side validation** = Security protection

Cả hai đều quan trọng, nhưng chỉ server-side mới đảm bảo security thực sự!
