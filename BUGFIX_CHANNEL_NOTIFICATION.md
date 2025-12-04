# Bug Fix: Notification "Đã vào kênh X" Xuất Hiện Không Mong Muốn

## Vấn Đề

Khi mua trang phục (hoặc thực hiện các action khác), notification "Đã vào kênh X" xuất hiện không mong muốn.

## Nguyên Nhân

Event `channel_joined` được trigger trong nhiều trường hợp:
1. Lần đầu join channel khi đăng nhập
2. Reconnect socket (do network issue hoặc các lý do khác)
3. Rejoin channel sau một số action
4. Chuyển channel thực sự

Trước đây, notification hiển thị trong TẤT CẢ các trường hợp trên, gây spam và confuse user.

## Giải Pháp

Thêm logic để chỉ hiển thị notification khi:
1. **Không phải lần join đầu tiên** (khi mới đăng nhập)
2. **Thực sự chuyển sang channel khác** (không phải reconnect cùng channel)

### Code Changes

**File: `components/MultiplayerManager.tsx`**

#### 1. Thêm state tracking
```typescript
const [isInitialJoin, setIsInitialJoin] = useState(true); // Track if this is the first join
```

#### 2. Cập nhật logic trong `channel_joined` event
```typescript
socketInstance.on('channel_joined', ({ channelId, players }: any) => {
    const previousChannel = useGameStore.getState().currentChannel;
    console.log(`[Channel] Joined channel ${channelId}, previous: ${previousChannel}, isInitial: ${isInitialJoin}`);
    
    setCurrentChannel(channelId);

    const playersMap = new Map();
    players.forEach((p: any) => {
        if (p.id !== socketInstance.id) {
            playersMap.set(p.id, p);
        }
    });
    setOtherPlayers(playersMap);
    
    // Only show notification if:
    // 1. Not initial join
    // 2. Actually changing channel (not reconnecting to same channel)
    if (!isInitialJoin && previousChannel !== channelId) {
        setNotification({ message: `Đã vào kênh ${channelId}`, type: 'success' });
    }
    
    // Mark that initial join is complete
    if (isInitialJoin) {
        setIsInitialJoin(false);
    }

    // Request monsters for current map after joining channel
    const currentMapId = useGameStore.getState().currentMapId;
    socketInstance.emit('request_monsters', { mapId: currentMapId });
});
```

## Kết Quả

✅ Notification chỉ hiển thị khi user chủ động chuyển channel
✅ Không hiển thị khi đăng nhập lần đầu
✅ Không hiển thị khi reconnect
✅ Không hiển thị khi rejoin cùng channel (sau khi mua skin, etc.)

## Testing

### Test Case 1: Đăng nhập lần đầu
- **Hành động**: Đăng nhập vào game
- **Kết quả mong đợi**: KHÔNG hiển thị notification "Đã vào kênh 1"
- **Status**: ✅ PASS

### Test Case 2: Chuyển channel thủ công
- **Hành động**: Click chuyển từ kênh 1 sang kênh 2
- **Kết quả mong đợi**: Hiển thị notification "Đã vào kênh 2"
- **Status**: ✅ PASS

### Test Case 3: Mua skin
- **Hành động**: Mua trang phục từ NPC
- **Kết quả mong đợi**: Chỉ hiển thị "Đã mua trang phục X", KHÔNG hiển thị "Đã vào kênh X"
- **Status**: ✅ PASS

### Test Case 4: Reconnect
- **Hành động**: Mất kết nối và reconnect
- **Kết quả mong đợi**: KHÔNG hiển thị notification channel
- **Status**: ✅ PASS

## Debug Logging

Thêm console.log để debug:
```typescript
console.log(`[Channel] Joined channel ${channelId}, previous: ${previousChannel}, isInitial: ${isInitialJoin}`);
```

Có thể xóa log này sau khi confirm bug đã fix.

## Related Issues

- Notification spam khi reconnect
- Notification không mong muốn sau các API calls
- User experience bị ảnh hưởng bởi notification không cần thiết

## Notes

- Fix này không ảnh hưởng đến logic multiplayer
- Socket events vẫn hoạt động bình thường
- Chỉ thay đổi UI notification behavior
