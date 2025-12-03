import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyToken } from '@/lib/jwt.mjs';

/**
 * API: Buy Item / Service
 * Xử lý mua items hoặc dịch vụ từ NPC
 */
export async function POST(request) {
    try {
        const body = await request.json();
        const { itemId, itemName, price, userId, sessionId, token, npcId } = body;

        console.log('[BuyItem] Purchase:', { itemId, itemName, price, userId, npcId });

        // Verify token
        if (!token) {
            return NextResponse.json(
                { error: 'Token không được cung cấp' },
                { status: 401 }
            );
        }

        const tokenResult = verifyToken(token);
        if (!tokenResult.valid) {
            return NextResponse.json(
                { error: 'Token không hợp lệ: ' + tokenResult.error },
                { status: 401 }
            );
        }

        if (tokenResult.data.userId !== userId || tokenResult.data.sessionId !== sessionId) {
            return NextResponse.json(
                { error: 'Thông tin xác thực không khớp' },
                { status: 401 }
            );
        }

        // Lấy thông tin gold từ user_inventory
        const [inventory] = await db.query(
            'SELECT gold FROM user_inventory WHERE user_id = ?',
            [userId]
        );

        if (inventory.length === 0) {
            return NextResponse.json(
                { error: 'Không tìm thấy inventory' },
                { status: 404 }
            );
        }

        const currentGold = inventory[0].gold;

        // Kiểm tra đủ tiền không
        if (currentGold < price) {
            return NextResponse.json(
                { error: 'Không đủ vàng', currentGold, required: price },
                { status: 400 }
            );
        }

        // Xử lý theo loại item
        if (itemId === 'heal-hp' || itemId === 'heal-mp' || itemId === 'heal-all') {
            // Dịch vụ healing từ NPC healer
            const [stats] = await db.query(
                'SELECT hp, max_hp, mp, max_mp FROM user_stats WHERE user_id = ?',
                [userId]
            );

            if (stats.length === 0) {
                return NextResponse.json(
                    { error: 'Không tìm thấy stats' },
                    { status: 404 }
                );
            }

            let newHp = stats[0].hp;
            let newMp = stats[0].mp;

            if (itemId === 'heal-hp') {
                newHp = stats[0].max_hp; // Hồi đầy HP
            } else if (itemId === 'heal-mp') {
                newMp = stats[0].max_mp; // Hồi đầy MP
            } else if (itemId === 'heal-all') {
                newHp = stats[0].max_hp; // Hồi đầy cả HP và MP
                newMp = stats[0].max_mp;
            }

            // Trừ tiền và update stats
            await db.query('BEGIN');
            
            await db.query(
                'UPDATE user_inventory SET gold = gold - ? WHERE user_id = ?',
                [price, userId]
            );

            await db.query(
                'UPDATE user_stats SET hp = ?, mp = ? WHERE user_id = ?',
                [newHp, newMp, userId]
            );

            await db.query('COMMIT');

            return NextResponse.json({
                success: true,
                message: `${itemName} thành công!`,
                gold: currentGold - price,
                hp: newHp,
                maxHp: stats[0].max_hp,
                mp: newMp,
                maxMp: stats[0].max_mp
            });

        } else {
            // Mua item thông thường (thêm vào inventory)
            // TODO: Implement inventory system
            
            // Tạm thời chỉ trừ tiền
            await db.query(
                'UPDATE user_inventory SET gold = gold - ? WHERE user_id = ?',
                [price, userId]
            );

            return NextResponse.json({
                success: true,
                message: `Đã mua ${itemName} với giá ${price} vàng!`,
                gold: currentGold - price,
                item: { itemId, itemName, price }
            });
        }

    } catch (error) {
        console.error('[BuyItem] Error:', error);
        
        // Rollback nếu có lỗi
        try {
            await db.query('ROLLBACK');
        } catch (e) {
            // Ignore rollback error
        }

        return NextResponse.json({
            success: false,
            error: 'Lỗi server: ' + error.message
        }, { status: 500 });
    }
}
