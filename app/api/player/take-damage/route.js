import db from '@/lib/db';
import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt.mjs';
import { parseRequestBody } from '@/lib/deobfuscateMiddleware';
import { calculatePlayerStats } from '@/lib/skinStatsHelper';

export async function POST(req) {
    try {
        const { userId, sessionId, token, attackerId, skillId, attackerToken } = await parseRequestBody(req);

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

        // Lấy skin của victim để tính defense
        const [victimUser] = await db.query(
            'SELECT skin FROM users WHERE id = ?',
            [userId]
        );
        
        const victimSkin = victimUser[0]?.skin || 'knight';
        const victimSkinStats = calculatePlayerStats(victimSkin);

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

        const baseDamage = skillDamage[skillId] || 10;
        
        // Áp dụng defense bonus từ skin
        const finalDamage = Math.max(1, baseDamage - victimSkinStats.defense);

        // Tính toán HP mới
        const newHp = Math.max(0, currentStats.hp - finalDamage);

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
            baseDamage,
            defense: victimSkinStats.defense,
            finalDamage,
            oldHp: currentStats.hp, 
            newHp,
            isDead
        });

        return NextResponse.json({
            success: true,
            hp: newHp,
            maxHp: currentStats.max_hp,
            damage: finalDamage,
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
