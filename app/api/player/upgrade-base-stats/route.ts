import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import { parseRequestBody } from '@/lib/deobfuscateMiddleware';
import { SKINS } from '@/lib/skinData';

export async function POST(req: Request) {
    try {
        const { userId, sessionId, token, baseMaxHp, baseMaxMp, baseAttack, baseDefense, baseSpeed } = await parseRequestBody(req);

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

        const skinId = userRows[0]?.skin || 'knight';
        const skinData = SKINS[skinId];

        // Update base stats (nếu có)
        const newBaseMaxHp = baseMaxHp !== undefined ? baseMaxHp : currentStats[0].base_max_hp;
        const newBaseMaxMp = baseMaxMp !== undefined ? baseMaxMp : currentStats[0].base_max_mp;
        const newBaseAttack = baseAttack !== undefined ? baseAttack : currentStats[0].base_attack;
        const newBaseDefense = baseDefense !== undefined ? baseDefense : currentStats[0].base_defense;
        const newBaseSpeed = baseSpeed !== undefined ? baseSpeed : currentStats[0].base_speed;

        // Tính final stats với skin bonus (TẤT CẢ ĐỀU LÀ %)
        const hpBonus = skinData?.stats?.maxHpBonus || 0;
        const mpBonus = skinData?.stats?.maxMpBonus || 0;
        const attackBonus = skinData?.stats?.attackBonus || 0;
        const defenseBonus = skinData?.stats?.defenseBonus || 0;
        const speedBonus = skinData?.stats?.speedBonus || 0;

        // Formula: Final = Base * (1 + Bonus%)
        const finalMaxHp = Math.floor(newBaseMaxHp * (1 + hpBonus / 100));
        const finalMaxMp = Math.floor(newBaseMaxMp * (1 + mpBonus / 100));
        const finalAttack = Math.floor(newBaseAttack * (1 + attackBonus / 100));
        const finalDefense = Math.floor(newBaseDefense * (1 + defenseBonus / 100));
        const finalSpeed = newBaseSpeed * (1 + speedBonus / 100);

        // Tính % HP/MP hiện tại để scale
        const hpPercent = currentStats[0].hp / currentStats[0].max_hp;
        const mpPercent = currentStats[0].mp / currentStats[0].max_mp;
        const newHp = Math.floor(finalMaxHp * hpPercent);
        const newMp = Math.floor(finalMaxMp * mpPercent);

        // Update database
        await db.query(
            'UPDATE user_stats SET base_max_hp = ?, base_max_mp = ?, base_attack = ?, base_defense = ?, base_speed = ?, max_hp = ?, hp = ?, max_mp = ?, mp = ?, attack = ?, defense = ?, speed = ? WHERE user_id = ?',
            [newBaseMaxHp, newBaseMaxMp, newBaseAttack, newBaseDefense, newBaseSpeed, finalMaxHp, newHp, finalMaxMp, newMp, finalAttack, finalDefense, finalSpeed, userId]
        );

        console.log(`[UpgradeStats] User ${userId} upgraded base stats:`, {
            baseMaxHp: newBaseMaxHp,
            baseMaxMp: newBaseMaxMp,
            baseAttack: newBaseAttack,
            baseDefense: newBaseDefense,
            baseSpeed: newBaseSpeed,
            skinId,
            finalMaxHp,
            finalMaxMp,
            finalAttack,
            finalDefense,
            finalSpeed
        });

        return NextResponse.json({
            success: true,
            message: 'Đã nâng cấp chỉ số!',
            stats: {
                baseMaxHp: newBaseMaxHp,
                baseMaxMp: newBaseMaxMp,
                baseAttack: newBaseAttack,
                baseDefense: newBaseDefense,
                baseSpeed: newBaseSpeed,
                maxHp: finalMaxHp,
                hp: newHp,
                maxMp: finalMaxMp,
                mp: newMp,
                attack: finalAttack,
                defense: finalDefense,
                speed: finalSpeed
            }
        });

    } catch (error: any) {
        console.error('Upgrade base stats error:', error);
        return NextResponse.json(
            { error: 'Lỗi server khi nâng cấp chỉ số' },
            { status: 500 }
        );
    }
}
