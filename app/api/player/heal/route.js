import db from '@/lib/db';
import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt.mjs';
import { checkRequestId } from '@/lib/requestIdMiddleware';
import { parseRequestBody } from '@/lib/deobfuscateMiddleware';

export async function POST(req) {
    try {
        const { userId, sessionId, token, skillId, requestId } = await parseRequestBody(req);

        console.log('[Heal] Request:', { userId, sessionId, skillId });

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

        // Check request ID để tránh duplicate
        const requestCheck = await checkRequestId(requestId, userId, 'heal');
        if (!requestCheck.valid) {
            if (requestCheck.isDuplicate) {
                // Duplicate request - trả về success nhưng không xử lý
                return NextResponse.json({
                    success: true,
                    message: 'Request đã được xử lý trước đó',
                    isDuplicate: true
                });
            }
            return NextResponse.json(
                { error: requestCheck.error },
                { status: 400 }
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

        // Định nghĩa skill healing
        const healingSkills = {
            'heal': { hpRestore: 50, mpCost: 20 },
            'greater-heal': { hpRestore: 100, mpCost: 40 },
            'full-heal': { hpRestore: 999999, mpCost: 80 } // Restore to max
        };

        const skill = healingSkills[skillId];
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

        // Tính toán HP và MP mới
        const newHp = Math.min(currentStats.hp + skill.hpRestore, currentStats.max_hp);
        const newMp = currentStats.mp - skill.mpCost;

        // Cập nhật database
        await db.query(
            'UPDATE user_stats SET hp = ?, mp = ? WHERE user_id = ?',
            [newHp, newMp, userId]
        );

        console.log('[Heal] Success:', { 
            userId, 
            skillId, 
            oldHp: currentStats.hp, 
            newHp, 
            oldMp: currentStats.mp, 
            newMp 
        });

        return NextResponse.json({
            success: true,
            hp: newHp,
            maxHp: currentStats.max_hp,
            mp: newMp,
            maxMp: currentStats.max_mp,
            healed: newHp - currentStats.hp
        });

    } catch (error) {
        console.error('Heal error:', error);
        return NextResponse.json(
            { error: 'Lỗi server: ' + error.message },
            { status: 500 }
        );
    }
}
