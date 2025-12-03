import db from '@/lib/db';
import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt.mjs';
import { parseRequestBody } from '@/lib/deobfuscateMiddleware';

export async function POST(req) {
    try {
        const { userId, sessionId, token } = await parseRequestBody(req);

        console.log('[GetStats] Request:', { userId, sessionId });

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

        // Lấy stats từ database
        const [stats] = await db.query(
            'SELECT hp, max_hp, mp, max_mp, level, experience FROM user_stats WHERE user_id = ?',
            [userId]
        );

        if (stats.length === 0) {
            return NextResponse.json(
                { error: 'Không tìm thấy thông tin người chơi' },
                { status: 404 }
            );
        }

        // Lấy gold từ user_inventory
        const [inventory] = await db.query(
            'SELECT gold FROM user_inventory WHERE user_id = ?',
            [userId]
        );

        console.log('[GetStats] Success:', { userId, stats: stats[0], gold: inventory[0]?.gold });

        return NextResponse.json({
            success: true,
            stats: stats[0],
            gold: inventory[0]?.gold || 0
        });

    } catch (error) {
        console.error('Get stats error:', error);
        return NextResponse.json(
            { error: 'Lỗi server: ' + error.message },
            { status: 500 }
        );
    }
}
