import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import { parseRequestBody } from '@/lib/deobfuscateMiddleware';
import { getAllSkins } from '@/lib/skinData';

export async function POST(req: Request) {
    try {
        const { userId, sessionId, token } = await parseRequestBody(req);

        // Validate required fields
        if (!userId || !sessionId || !token) {
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

        // Get all skins
        const allSkins = getAllSkins();

        // Get user's owned skins
        const [ownedSkinRows] = await db.query(
            'SELECT skin_id FROM user_skin WHERE user_id = ?',
            [userId]
        ) as any[];

        const ownedSkinIds = ownedSkinRows.map((s: any) => s.skin_id);

        // Get user's current equipped skin
        const [userRows] = await db.query(
            'SELECT skin FROM users WHERE id = ?',
            [userId]
        ) as any[];

        const currentSkin = userRows[0]?.skin || 'knight';

        // Map skins with ownership status
        const skinsWithStatus = allSkins.map(skin => ({
            ...skin,
            owned: ownedSkinIds.includes(skin.id),
            equipped: skin.id === currentSkin
        }));

        return NextResponse.json({
            success: true,
            skins: skinsWithStatus,
            currentSkin: currentSkin
        });

    } catch (error: any) {
        console.error('List skins error:', error);
        return NextResponse.json(
            { error: 'Lỗi server khi lấy danh sách skin' },
            { status: 500 }
        );
    }
}
