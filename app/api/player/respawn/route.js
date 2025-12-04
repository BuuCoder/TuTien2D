import db from '@/lib/db';
import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt.mjs';
import { parseRequestBody } from '@/lib/deobfuscateMiddleware';

export async function POST(req) {
    try {
        const { userId, sessionId, token } = await parseRequestBody(req);

        console.log('[Respawn] Request:', { userId, sessionId });

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

        // Lấy max stats và current MP từ database
        const [stats] = await db.query(
            'SELECT max_hp, mp, max_mp FROM user_stats WHERE user_id = ?',
            [userId]
        );

        if (stats.length === 0) {
            return NextResponse.json(
                { error: 'Không tìm thấy thông tin người chơi' },
                { status: 404 }
            );
        }

        const { max_hp, mp, max_mp } = stats[0];

        // Restore HP về 1, giữ nguyên MP hiện tại
        await db.query(
            'UPDATE user_stats SET hp = ? WHERE user_id = ?',
            [1, userId]
        );

        console.log('[Respawn] Success:', { 
            userId, 
            hp: 1,
            mp: mp
        });

        return NextResponse.json({
            success: true,
            hp: 1,
            maxHp: max_hp,
            mp: mp,
            maxMp: max_mp,
            message: 'Hồi sinh với HP = 1'
        });

    } catch (error) {
        console.error('Respawn error:', error);
        return NextResponse.json(
            { error: 'Lỗi server: ' + error.message },
            { status: 500 }
        );
    }
}
