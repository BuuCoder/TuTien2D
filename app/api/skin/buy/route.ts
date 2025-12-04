import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import { parseRequestBody } from '@/lib/deobfuscateMiddleware';
import { SKINS } from '@/lib/skinData';

export async function POST(req: Request) {
    try {
        const { userId, sessionId, token, skinId } = await parseRequestBody(req);

        // Validate required fields
        if (!userId || !sessionId || !token || !skinId) {
            return NextResponse.json(
                { error: 'Thiếu thông tin bắt buộc' },
                { status: 400 }
            );
        }

        // Validate token
        const tokenResult = verifyToken(token);
        if (!tokenResult.valid) {
            return NextResponse.json(
                { error: 'Token không hợp lệ' },
                { status: 401 }
            );
        }

        // Verify token data matches request
        const tokenData = tokenResult.data;
        if (tokenData.userId !== userId || tokenData.sessionId !== sessionId) {
            return NextResponse.json(
                { error: 'Thông tin xác thực không khớp' },
                { status: 401 }
            );
        }

        // Validate skin exists
        const skin = SKINS[skinId];
        if (!skin) {
            return NextResponse.json(
                { error: 'Skin không tồn tại' },
                { status: 400 }
            );
        }

        // Validate skin is not default (cannot buy default skin)
        if (skin.isDefault) {
            return NextResponse.json(
                { error: 'Không thể mua skin mặc định' },
                { status: 400 }
            );
        }

        // Check if user already owns this skin
        const [existingSkin] = await db.query(
            'SELECT * FROM user_skin WHERE user_id = ? AND skin_id = ?',
            [userId, skinId]
        );

        if (existingSkin.length > 0) {
            return NextResponse.json(
                { error: 'Bạn đã sở hữu trang phục này!' },
                { status: 400 }
            );
        }

        // Get user's gold
        const [inventory] = await db.query(
            'SELECT gold FROM user_inventory WHERE user_id = ?',
            [userId]
        );

        if (inventory.length === 0) {
            return NextResponse.json(
                { error: 'Không tìm thấy thông tin người chơi' },
                { status: 404 }
            );
        }

        const currentGold = inventory[0].gold;

        // Check if user has enough gold
        if (currentGold < skin.price) {
            return NextResponse.json(
                { error: `Không đủ vàng! Cần ${skin.price} vàng.` },
                { status: 400 }
            );
        }

        // Use transaction to ensure atomicity
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // Deduct gold with additional check (prevent race condition)
            const [updateResult] = await connection.query(
                'UPDATE user_inventory SET gold = gold - ? WHERE user_id = ? AND gold >= ?',
                [skin.price, userId, skin.price]
            );

            // Check if update was successful (gold was sufficient)
            if (updateResult.affectedRows === 0) {
                await connection.rollback();
                return NextResponse.json(
                    { error: 'Không đủ vàng hoặc giao dịch thất bại' },
                    { status: 400 }
                );
            }

            // Add skin to user_skin
            await connection.query(
                'INSERT INTO user_skin (user_id, skin_id) VALUES (?, ?)',
                [userId, skinId]
            );

            // Commit transaction
            await connection.commit();

            // Get updated gold
            const [updatedInventory] = await connection.query(
                'SELECT gold FROM user_inventory WHERE user_id = ?',
                [userId]
            );

            connection.release();

            return NextResponse.json({
                success: true,
                message: `Đã mua trang phục ${skin.name}!`,
                gold: updatedInventory[0].gold,
                skinId: skinId
            });

        } catch (transactionError) {
            await connection.rollback();
            connection.release();
            throw transactionError;
        }

    } catch (error: any) {
        console.error('Buy skin error:', error);
        
        // Log security-related errors
        if (error.message?.includes('Duplicate entry')) {
            console.warn(`[Security] User ${userId} tried to buy skin ${skinId} twice`);
            return NextResponse.json(
                { error: 'Bạn đã sở hữu trang phục này!' },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Lỗi server khi xử lý giao dịch' },
            { status: 500 }
        );
    }
}
