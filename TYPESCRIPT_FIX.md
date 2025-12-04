# TypeScript Fix - MySQL Query Results

## Vấn Đề

TypeScript error khi destructure query results từ mysql2:

```
Property 'length' does not exist on type 'QueryResult'.
Property 'length' does not exist on type 'OkPacket'.
```

## Nguyên Nhân

`db.query()` trả về `QueryResult` type, là union type của nhiều types khác nhau:
- `RowDataPacket[][]` - For SELECT queries
- `OkPacket` - For INSERT/UPDATE/DELETE
- `ResultSetHeader` - For other operations

Khi destructure `const [result] = await db.query(...)`, TypeScript không biết chính xác type nào được trả về.

## Giải Pháp

### ❌ Code Cũ (Lỗi)
```typescript
const [existingSkin] = await db.query(
    'SELECT * FROM user_skin WHERE user_id = ? AND skin_id = ?',
    [userId, skinId]
);

if (existingSkin.length > 0) {  // ← Error: Property 'length' does not exist
    // ...
}
```

### ✅ Code Mới (Đúng)
```typescript
const [existingSkinRows] = await db.query(
    'SELECT * FROM user_skin WHERE user_id = ? AND skin_id = ?',
    [userId, skinId]
) as any[];  // ← Type assertion

if (existingSkinRows.length > 0) {  // ← OK
    // ...
}
```

## Files Fixed

### 1. app/api/skin/buy/route.ts
```typescript
// Before
const [existingSkin] = await db.query(...);
const [inventory] = await db.query(...);
const [updatedInventory] = await connection.query(...);

// After
const [existingSkinRows] = await db.query(...) as any[];
const [inventoryRows] = await db.query(...) as any[];
const [updatedInventoryRows] = await connection.query(...) as any[];
```

### 2. app/api/skin/equip/route.ts
```typescript
// Before
const [ownedSkin] = await db.query(...);
const [updateResult] = await db.query(...);

// After
const [ownedSkinRows] = await db.query(...) as any[];
const [updateResult] = await db.query(...) as any[];
if ((updateResult as any).affectedRows === 0) { ... }
```

### 3. app/api/skin/list/route.ts
```typescript
// Before
const [ownedSkins] = await db.query(...);
const [user] = await db.query(...);

// After
const [ownedSkinRows] = await db.query(...) as any[];
const [userRows] = await db.query(...) as any[];
```

## Pattern to Follow

### For SELECT queries (returns rows)
```typescript
const [rows] = await db.query(
    'SELECT * FROM table WHERE id = ?',
    [id]
) as any[];

// Access data
if (rows.length > 0) {
    const data = rows[0];
}
```

### For INSERT/UPDATE/DELETE (returns OkPacket)
```typescript
const [result] = await db.query(
    'UPDATE table SET field = ? WHERE id = ?',
    [value, id]
) as any[];

// Access affected rows
if ((result as any).affectedRows > 0) {
    // Success
}
```

## Alternative Solutions

### Option 1: Type Assertion (Current)
```typescript
const [rows] = await db.query(...) as any[];
```
**Pros**: Simple, works immediately
**Cons**: Loses type safety

### Option 2: Proper Typing
```typescript
import { RowDataPacket } from 'mysql2';

const [rows] = await db.query(...) as RowDataPacket[][];
```
**Pros**: Type safe
**Cons**: More verbose

### Option 3: Custom Type Guard
```typescript
function isRowDataPacket(result: any): result is RowDataPacket[][] {
    return Array.isArray(result);
}

const result = await db.query(...);
if (isRowDataPacket(result)) {
    const [rows] = result;
}
```
**Pros**: Most type safe
**Cons**: Most verbose

## Best Practices

### 1. Consistent Naming
```typescript
// Good - Clear what it contains
const [userRows] = await db.query('SELECT * FROM users...') as any[];
const [inventoryRows] = await db.query('SELECT * FROM inventory...') as any[];

// Bad - Ambiguous
const [result] = await db.query(...) as any[];
const [data] = await db.query(...) as any[];
```

### 2. Type Assertion Position
```typescript
// Good - At query level
const [rows] = await db.query(...) as any[];

// Bad - At usage level
const [rows] = await db.query(...);
if ((rows as any).length > 0) { ... }
```

### 3. Check Before Access
```typescript
// Good - Safe
const [rows] = await db.query(...) as any[];
if (rows.length > 0) {
    const data = rows[0];
}

// Bad - Unsafe
const [rows] = await db.query(...) as any[];
const data = rows[0]; // Might be undefined
```

## Testing

After fix, verify:
- [ ] TypeScript compilation succeeds
- [ ] No runtime errors
- [ ] All API endpoints work
- [ ] Database queries return correct data

## Related Issues

- TypeScript strict mode
- mysql2 type definitions
- Query result types
- Type assertions vs type guards

## Conclusion

Fixed all TypeScript errors by:
1. ✅ Adding `as any[]` type assertions
2. ✅ Renaming variables for clarity
3. ✅ Consistent pattern across all files

Build should now succeed! 🎉
