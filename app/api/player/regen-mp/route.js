import db from '@/lib/db';
import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt.mjs';
import { parseRequestBody } from '@/lib/deobfuscateMiddleware';

/**
 * API để sync MP regeneration với database
 * Được gọi mỗi 10 giây khi MP đang regenerate
 */
export async function POST(req) {
    try {
        const { userId, sessionId, token, mp } = await parseRequestBody(req);

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

        // Lấy max_mp từ database để validate
        const [stats] = await db.query(
            'SELECT max_mp FROM user_stats WHERE user_id = ?',
            [userId]
        );

        if (stats.length === 0) {
            return NextResponse.json(
                { error: 'Không tìm thấy thông tin người chơi' },
                { status: 404 }
            );
        }

        const maxMp = stats[0].max_mp;

        // Validate MP không vượt quá max
        if (mp > maxMp) {
            return NextResponse.json(
                { error: 'MP không thể vượt quá max MP' },
                { status: 400 }
            );
        }

        // Update MP trong database
        await db.query(
            'UPDATE user_stats SET mp = ? WHERE user_id = ?',
            [mp, userId]
        );

        console.log('[RegenMP] MP regenerated and synced:', { userId, mp, maxMp });

        return NextResponse.json({
            success: true,
            mp: mp,
            maxMp: maxMp
        });

    } catch (error) {
        console.error('Regen MP error:', error);
        return NextResponse.json(
            { error: 'Lỗi server: ' + error.message },
            { status: 500 }
        );
    }
}
