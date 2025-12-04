import db from '@/lib/db';
import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt.mjs';
import { parseRequestBody } from '@/lib/deobfuscateMiddleware';
import { calculatePlayerStats } from '@/lib/skinStatsHelper';

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

        // Lấy stats từ database (max HP/MP đã bao gồm skin bonuses)
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

        // Lấy gold và skin từ users
        const [userRows] = await db.query(
            'SELECT skin FROM users WHERE id = ?',
            [userId]
        );
        
        const [inventory] = await db.query(
            'SELECT gold FROM user_inventory WHERE user_id = ?',
            [userId]
        );

        // Lấy attack/defense từ skin
        const currentSkin = userRows[0]?.skin || 'knight';
        const skinStats = calculatePlayerStats(currentSkin);
        
        // Stats: max HP/MP từ DB (đã có skin bonuses), attack/defense từ skin
        const finalStats = {
            ...stats[0],
            attack: skinStats.attack,
            defense: skinStats.defense,
        };

        console.log('[GetStats] Success:', { userId, stats: finalStats, gold: inventory[0]?.gold, skin: currentSkin });

        return NextResponse.json({
            success: true,
            stats: finalStats,
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
