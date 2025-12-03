import db from '@/lib/db';
import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt.mjs';
import { parseRequestBody } from '@/lib/deobfuscateMiddleware';

export async function POST(req) {
    try {
        const { userId, sessionId, token, skillId, targetType } = await parseRequestBody(req);

        console.log('[UseSkill] Request:', { userId, sessionId, skillId, targetType });

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

        // Lấy stats hiện tại từ database
        const [stats] = await db.query(
            'SELECT hp, max_hp, mp, max_mp FROM user_stats WHERE user_id = ?',
            [userId]
        );

        if (stats.length === 0) {
            return NextResponse.json(
                { error: 'Không tìm thấy thông tin người chơi' },
                { status: 404 }
            );
        }

        const currentStats = stats[0];

        // Định nghĩa MP cost cho các skill
        const skillCosts = {
            'basic-attack': { mpCost: 0, damage: 10 },
            'slash': { mpCost: 10, damage: 25 },
            'charge': { mpCost: 15, damage: 35 },
            'fireball': { mpCost: 20, damage: 40 },
            'ice-spike': { mpCost: 25, damage: 45 },
            'holy-strike': { mpCost: 30, damage: 50 },
            'block': { mpCost: 5, damage: 0 }
        };

        const skill = skillCosts[skillId];
        if (!skill) {
            return NextResponse.json(
                { error: 'Skill không hợp lệ' },
                { status: 400 }
            );
        }

        // Kiểm tra MP đủ không
        if (currentStats.mp < skill.mpCost) {
            return NextResponse.json(
                { error: 'Không đủ MP để sử dụng skill này', currentMp: currentStats.mp },
                { status: 400 }
            );
        }

        // Trừ MP
        const newMp = currentStats.mp - skill.mpCost;

        // Cập nhật database
        await db.query(
            'UPDATE user_stats SET mp = ? WHERE user_id = ?',
            [newMp, userId]
        );

        console.log('[UseSkill] Success:', { 
            userId, 
            skillId, 
            damage: skill.damage,
            oldMp: currentStats.mp, 
            newMp 
        });

        return NextResponse.json({
            success: true,
            mp: newMp,
            maxMp: currentStats.max_mp,
            damage: skill.damage,
            mpCost: skill.mpCost
        });

    } catch (error) {
        console.error('Use skill error:', error);
        return NextResponse.json(
            { error: 'Lỗi server: ' + error.message },
            { status: 500 }
        );
    }
}
