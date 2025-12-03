import db from '@/lib/db';
import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt.mjs';
import { parseRequestBody } from '@/lib/deobfuscateMiddleware';

/**
 * API để thêm gold (không cho phép set gold tùy ý)
 * Server tự tính toán gold mới = gold hiện tại + amount
 */
export async function POST(req) {
    try {
        const { userId, sessionId, token, amount } = await parseRequestBody(req);

        console.log('[AddGold] Request:', { userId, amount });

        if (!token) {
            return NextResponse.json(
                { error: 'Token không được cung cấp' },
                { status: 401 }
            );
        }

        // Verify token
        const tokenResult = verifyToken(token);
        if (!tokenResult.valid) {
            return NextResponse.json(
                { error: 'Token không hợp lệ: ' + tokenResult.error },
                { status: 401 }
            );
        }

        // Verify token data matches
        if (tokenResult.data.userId !== userId || tokenResult.data.sessionId !== sessionId) {
            return NextResponse.json(
                { error: 'Thông tin xác thực không khớp' },
                { status: 401 }
            );
        }

        // Validate amount
        if (typeof amount !== 'number' || amount <= 0 || amount > 10000) {
            return NextResponse.json(
                { error: 'Số lượng gold không hợp lệ (1-10000)' },
                { status: 400 }
            );
        }

        // Lấy gold hiện tại từ database
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

        const currentGold = inventory[0].gold || 0;
        const newGold = currentGold + amount;

        // Update gold trong database
        await db.query(
            'UPDATE user_inventory SET gold = ? WHERE user_id = ?',
            [newGold, userId]
        );

        console.log('[AddGold] Success:', { userId, oldGold: currentGold, newGold, amount });

        return NextResponse.json({
            success: true,
            gold: newGold,
            added: amount
        });

    } catch (error) {
        console.error('Add gold error:', error);
        return NextResponse.json(
            { error: 'Lỗi server: ' + error.message },
            { status: 500 }
        );
    }
}
