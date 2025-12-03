import db from '@/lib/db';
import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt.mjs';

/**
 * API để cập nhật Max HP và Max MP
 * CHỈ được gọi khi:
 * - Level up
 * - Trang bị item tăng max stats
 * - Buff/skill đặc biệt tăng max stats
 * 
 * KHÔNG dùng để cập nhật HP/MP hiện tại
 */
export async function POST(req) {
    try {
        const { userId, sessionId, token, maxHp, maxMp, reason } = await req.json();

        console.log('[UpdateMaxStats] Request:', { userId, sessionId, maxHp, maxMp, reason });

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

        // Validate reason (để log và audit)
        const validReasons = ['level_up', 'equipment', 'buff', 'skill', 'admin'];
        if (!reason || !validReasons.includes(reason)) {
            return NextResponse.json(
                { error: 'Lý do cập nhật không hợp lệ' },
                { status: 400 }
            );
        }

        // Lấy stats hiện tại
        const [currentStats] = await db.query(
            'SELECT hp, max_hp, mp, max_mp FROM user_stats WHERE user_id = ?',
            [userId]
        );

        if (currentStats.length === 0) {
            return NextResponse.json(
                { error: 'Không tìm thấy thông tin người chơi' },
                { status: 404 }
            );
        }

        const stats = currentStats[0];
        const updates = [];
        const values = [];

        // Cập nhật max_hp nếu được cung cấp
        if (maxHp !== undefined) {
            if (maxHp < 1 || maxHp > 10000) {
                return NextResponse.json(
                    { error: 'Max HP không hợp lệ (1-10000)' },
                    { status: 400 }
                );
            }
            updates.push('max_hp = ?');
            values.push(maxHp);

            // Nếu HP hiện tại > max HP mới, điều chỉnh HP hiện tại
            if (stats.hp > maxHp) {
                updates.push('hp = ?');
                values.push(maxHp);
            }
        }

        // Cập nhật max_mp nếu được cung cấp
        if (maxMp !== undefined) {
            if (maxMp < 1 || maxMp > 10000) {
                return NextResponse.json(
                    { error: 'Max MP không hợp lệ (1-10000)' },
                    { status: 400 }
                );
            }
            updates.push('max_mp = ?');
            values.push(maxMp);

            // Nếu MP hiện tại > max MP mới, điều chỉnh MP hiện tại
            if (stats.mp > maxMp) {
                updates.push('mp = ?');
                values.push(maxMp);
            }
        }

        if (updates.length === 0) {
            return NextResponse.json(
                { error: 'Không có gì để cập nhật' },
                { status: 400 }
            );
        }

        // Cập nhật database
        values.push(userId);
        await db.query(
            `UPDATE user_stats SET ${updates.join(', ')} WHERE user_id = ?`,
            values
        );

        // Lấy stats mới sau khi cập nhật
        const [newStats] = await db.query(
            'SELECT hp, max_hp, mp, max_mp FROM user_stats WHERE user_id = ?',
            [userId]
        );

        console.log('[UpdateMaxStats] Success:', {
            userId,
            reason,
            oldMaxHp: stats.max_hp,
            newMaxHp: newStats[0].max_hp,
            oldMaxMp: stats.max_mp,
            newMaxMp: newStats[0].max_mp
        });

        return NextResponse.json({
            success: true,
            stats: newStats[0],
            message: `Max stats updated (${reason})`
        });

    } catch (error) {
        console.error('Update max stats error:', error);
        return NextResponse.json(
            { error: 'Lỗi server: ' + error.message },
            { status: 500 }
        );
    }
}
