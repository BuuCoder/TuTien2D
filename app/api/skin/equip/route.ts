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

        // Check if user owns this skin
        const [ownedSkin] = await db.query(
            'SELECT * FROM user_skin WHERE user_id = ? AND skin_id = ?',
            [userId, skinId]
        );

        if (ownedSkin.length === 0) {
            return NextResponse.json(
                { error: 'Bạn chưa sở hữu trang phục này!' },
                { status: 400 }
            );
        }

        // Update user's current skin with additional verification
        const [updateResult] = await db.query(
            'UPDATE users SET skin = ? WHERE id = ? AND EXISTS (SELECT 1 FROM user_skin WHERE user_id = ? AND skin_id = ?)',
            [skinId, userId, userId, skinId]
        );

        // Verify update was successful
        if (updateResult.affectedRows === 0) {
            console.warn(`[Security] User ${userId} tried to equip unowned skin ${skinId}`);
            return NextResponse.json(
                { error: 'Không thể trang bị skin này' },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            message: `Đã trang bị ${skin.name}!`,
            skinId: skinId
        });

    } catch (error: any) {
        console.error('Equip skin error:', error);
        return NextResponse.json(
            { error: 'Lỗi server khi trang bị skin' },
            { status: 500 }
        );
    }
}
