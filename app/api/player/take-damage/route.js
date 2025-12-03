import db from '@/lib/db';
import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt.mjs';

export async function POST(req) {
    try {
        const { userId, sessionId, token, attackerId, skillId, attackerToken } = await req.json();

        console.log('[TakeDamage] Request:', { userId, sessionId, attackerId, skillId });

        // Validate victim token
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

        // Validate attacker token (để chống giả mạo attacker)
        if (attackerToken) {
            const attackerTokenResult = verifyToken(attackerToken);
            if (!attackerTokenResult.valid || attackerTokenResult.data.userId !== attackerId) {
                return NextResponse.json(
                    { error: 'Thông tin kẻ tấn công không hợp lệ' },
                    { status: 401 }
                );
            }
        }

        // Lấy stats của victim từ database
        const [victimStats] = await db.query(
            'SELECT hp, max_hp, mp, max_mp FROM user_stats WHERE user_id = ?',
            [userId]
        );

        if (victimStats.length === 0) {
            return NextResponse.json(
                { error: 'Không tìm thấy thông tin người chơi' },
                { status: 404 }
            );
        }

        const currentStats = victimStats[0];

        // Định nghĩa damage cho các skill (server-side validation)
        const skillDamage = {
            'basic-attack': 10,
            'slash': 25,
            'charge': 35,
            'fireball': 40,
            'ice-spike': 45,
            'holy-strike': 50,
            'monster-attack': 15 // Damage từ monster
        };

        const damage = skillDamage[skillId] || 10;

        // Tính toán HP mới
        const newHp = Math.max(0, currentStats.hp - damage);

        // Cập nhật database
        await db.query(
            'UPDATE user_stats SET hp = ? WHERE user_id = ?',
            [newHp, userId]
        );

        const isDead = newHp <= 0;

        console.log('[TakeDamage] Success:', { 
            userId, 
            attackerId,
            skillId,
            damage,
            oldHp: currentStats.hp, 
            newHp,
            isDead
        });

        return NextResponse.json({
            success: true,
            hp: newHp,
            maxHp: currentStats.max_hp,
            damage: damage,
            isDead: isDead
        });

    } catch (error) {
        console.error('Take damage error:', error);
        return NextResponse.json(
            { error: 'Lỗi server: ' + error.message },
            { status: 500 }
        );
    }
}
