import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import { parseRequestBody } from '@/lib/deobfuscateMiddleware';
import { SKINS } from '@/lib/skinData';

/**
 * API để tính lại final stats từ base stats + skin bonus
 * Gọi API này khi:
 * - Load game
 * - Sau khi equip skin
 * - Sau khi upgrade base stats
 * - Bất cứ khi nào cần đảm bảo stats đúng
 */
export async function POST(req: Request) {
    try {
        const { userId, sessionId, token } = await parseRequestBody(req);

        // Validate required fields
        if (!userId || !sessionId || !token) {
            return NextResponse.json(
                { error: 'Thiếu thông tin bắt buộc' },
                { status: 400 }
            );
        }

        // Validate token
        const tokenResult = verifyToken(token);
        if (!tokenResult.valid) {
            return NextResponse.json(
                { error: 'Token không hợp lệ' },
                { status: 401 }
            );
        }

        // Verify token data matches request
        const tokenData = tokenResult.data;
        if (tokenData.userId !== userId || tokenData.sessionId !== sessionId) {
            return NextResponse.json(
                { error: 'Thông tin xác thực không khớp' },
                { status: 401 }
            );
        }

        // Lấy current stats và skin
        const [currentStats] = await db.query(
            'SELECT hp, max_hp, mp, max_mp, base_max_hp, base_max_mp, base_attack, base_defense, base_speed FROM user_stats WHERE user_id = ?',
            [userId]
        ) as any[];

        if (currentStats.length === 0) {
            return NextResponse.json(
                { error: 'Không tìm thấy thông tin người chơi' },
                { status: 404 }
            );
        }

        const [userRows] = await db.query(
            'SELECT skin FROM users WHERE id = ?',
            [userId]
        ) as any[];

        const dbStats = currentStats[0];
        const skinId = userRows[0]?.skin || 'knight';
        const skinData = SKINS[skinId];

        // Lấy skin bonuses
        const hpBonus = skinData?.stats?.maxHpBonus || 0;
        const mpBonus = skinData?.stats?.maxMpBonus || 0;
        const attackBonus = skinData?.stats?.attackBonus || 0;
        const defenseBonus = skinData?.stats?.defenseBonus || 0;
        const speedBonus = skinData?.stats?.speedBonus || 0;

        // Base stats từ DB
        const baseMaxHp = dbStats.base_max_hp || 500;
        const baseMaxMp = dbStats.base_max_mp || 200;
        const baseAttack = dbStats.base_attack || 10;
        const baseDefense = dbStats.base_defense || 5;
        const baseSpeed = dbStats.base_speed || 5.00;

        // Tính final stats: Final = Base * (1 + Bonus%)
        const finalMaxHp = Math.floor(baseMaxHp * (1 + hpBonus / 100));
        const finalMaxMp = Math.floor(baseMaxMp * (1 + mpBonus / 100));
        const finalAttack = Math.floor(baseAttack * (1 + attackBonus / 100));
        const finalDefense = Math.floor(baseDefense * (1 + defenseBonus / 100));
        const finalSpeed = baseSpeed * (1 + speedBonus / 100);

        // Tính % HP/MP hiện tại để giữ nguyên
        const hpPercent = dbStats.hp / dbStats.max_hp;
        const mpPercent = dbStats.mp / dbStats.max_mp;
        const finalHp = Math.floor(finalMaxHp * hpPercent);
        const finalMp = Math.floor(finalMaxMp * mpPercent);

        // Update final stats vào DB
        await db.query(
            'UPDATE user_stats SET max_hp = ?, hp = ?, max_mp = ?, mp = ?, attack = ?, defense = ?, speed = ? WHERE user_id = ?',
            [finalMaxHp, finalHp, finalMaxMp, finalMp, finalAttack, finalDefense, finalSpeed, userId]
        );

        console.log(`[RecalculateStats] User ${userId} recalculated stats:`, {
            skinId,
            baseMaxHp,
            finalMaxHp,
            baseAttack,
            finalAttack,
            baseDefense,
            finalDefense
        });

        return NextResponse.json({
            success: true,
            message: 'Đã tính lại chỉ số!',
            stats: {
                maxHp: finalMaxHp,
                hp: finalHp,
                maxMp: finalMaxMp,
                mp: finalMp,
                attack: finalAttack,
                defense: finalDefense,
                speed: finalSpeed,
                baseMaxHp,
                baseMaxMp,
                baseAttack,
                baseDefense,
                baseSpeed
            }
        });

    } catch (error: any) {
        console.error('Recalculate stats error:', error);
        return NextResponse.json(
            { error: 'Lỗi server khi tính lại chỉ số' },
            { status: 500 }
        );
    }
}
