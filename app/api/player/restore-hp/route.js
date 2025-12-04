import db from '@/lib/db';
import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt.mjs';
import { parseRequestBody } from '@/lib/deobfuscateMiddleware';

export async function POST(req) {
    try {
        const { userId, sessionId, token } = await parseRequestBody(req);

        console.log('[RestoreHP] Request:', { userId, sessionId });

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

        // Lấy max HP/MP từ database
        const [stats] = await db.query(
            'SELECT max_hp, max_mp FROM user_stats WHERE user_id = ?',
            [userId]
        );

        if (stats.length === 0) {
            return NextResponse.json(
                { error: 'Không tìm thấy thông tin người chơi' },
                { status: 404 }
            );
        }

        const maxHp = stats[0].max_hp;
        const maxMp = stats[0].max_mp;

        // Restore HP/MP về 100%
        await db.query(
            'UPDATE user_stats SET hp = max_hp, mp = max_mp WHERE user_id = ?',
            [userId]
        );

        console.log('[RestoreHP] Success:', { userId, hp: maxHp, mp: maxMp });

        return NextResponse.json({
            success: true,
            hp: maxHp,
            maxHp: maxHp,
            mp: maxMp,
            maxMp: maxMp
        });

    } catch (error) {
        console.error('Restore HP error:', error);
        return NextResponse.json(
            { error: 'Lỗi server: ' + error.message },
            { status: 500 }
        );
    }
}
