import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import { parseRequestBody } from '@/lib/deobfuscateMiddleware';
import { SKINS } from '@/lib/skinData';

export async function POST(req: Request) {
    try {
        const { userId, sessionId, token, skinId } = await parseRequestBody(req);

        // Validate required fields
        if (!userId || !sessionId || !token || !skinId) {
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

        // Validate skin exists
        const skin = SKINS[skinId];
        if (!skin) {
            return NextResponse.json(
                { error: 'Skin không tồn tại' },
                { status: 400 }
            );
        }

        // Check if user owns this skin
        const [ownedSkinRows] = await db.query(
            'SELECT * FROM user_skin WHERE user_id = ? AND skin_id = ?',
            [userId, skinId]
        ) as any[];

        if (ownedSkinRows.length === 0) {
            return NextResponse.json(
                { error: 'Bạn chưa sở hữu trang phục này!' },
                { status: 400 }
            );
        }

        // Lấy current stats (bao gồm base stats) và old skin từ DB
        const [currentStats] = await db.query(
            'SELECT hp, max_hp, mp, max_mp, attack, defense, speed, base_max_hp, base_max_mp, base_attack, base_defense, base_speed FROM user_stats WHERE user_id = ?',
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

        const oldStats = currentStats[0];
        const oldSkinId = userRows[0]?.skin || 'knight';

        // Tính % HP/MP hiện tại để giữ nguyên sau khi đổi skin
        const hpPercent = oldStats.hp / oldStats.max_hp;
        const mpPercent = oldStats.mp / oldStats.max_mp;

        // Lấy base stats từ DB (stats gốc từ level/items)
        const baseMaxHp = oldStats.base_max_hp || 500;
        const baseMaxMp = oldStats.base_max_mp || 200;
        const baseAttack = oldStats.base_attack || 10;
        const baseDefense = oldStats.base_defense || 5;
        const baseSpeed = oldStats.base_speed || 5.00;

        // Lấy bonuses từ new skin
        const newSkinData = SKINS[skinId];
        const newHpBonus = newSkinData?.stats?.maxHpBonus || 0;
        const newMpBonus = newSkinData?.stats?.maxMpBonus || 0;
        const newAttackBonus = newSkinData?.stats?.attackBonus || 0;
        const newDefenseBonus = newSkinData?.stats?.defenseBonus || 0;
        const newSpeedBonus = newSkinData?.stats?.speedBonus || 0;
        
        // Tính final stats từ base stats + skin bonus (TẤT CẢ ĐỀU LÀ %)
        // Formula: Final = Base * (1 + Bonus%)
        const newMaxHp = Math.floor(baseMaxHp * (1 + newHpBonus / 100));
        const newMaxMp = Math.floor(baseMaxMp * (1 + newMpBonus / 100));
        const newAttack = Math.floor(baseAttack * (1 + newAttackBonus / 100));
        const newDefense = Math.floor(baseDefense * (1 + newDefenseBonus / 100));
        const newSpeed = baseSpeed * (1 + newSpeedBonus / 100);

        // Tính HP/MP mới dựa trên % (giữ nguyên %)
        const newHp = Math.floor(newMaxHp * hpPercent);
        const newMp = Math.floor(newMaxMp * mpPercent);

        // Update user's current skin with additional verification
        const [updateResult] = await db.query(
            'UPDATE users SET skin = ? WHERE id = ? AND EXISTS (SELECT 1 FROM user_skin WHERE user_id = ? AND skin_id = ?)',
            [skinId, userId, userId, skinId]
        ) as any[];

        // Verify update was successful
        if ((updateResult as any).affectedRows === 0) {
            console.warn(`[Security] User ${userId} tried to equip unowned skin ${skinId}`);
            return NextResponse.json(
                { error: 'Không thể trang bị skin này' },
                { status: 400 }
            );
        }

        // Update final stats trong database (base stats không đổi)
        await db.query(
            'UPDATE user_stats SET max_hp = ?, hp = ?, max_mp = ?, mp = ?, attack = ?, defense = ?, speed = ? WHERE user_id = ?',
            [newMaxHp, newHp, newMaxMp, newMp, newAttack, newDefense, newSpeed, userId]
        );

        console.log(`[SkinEquip] User ${userId} equipped ${skinId}:`, {
            oldSkin: oldSkinId,
            newSkin: skinId,
            baseMaxHp,
            baseMaxMp,
            baseAttack,
            baseDefense,
            baseSpeed,
            newMaxHp,
            newMaxMp,
            newAttack,
            newDefense,
            newSpeed,
            hpPercent: (hpPercent * 100).toFixed(1) + '%',
            mpPercent: (mpPercent * 100).toFixed(1) + '%'
        });

        return NextResponse.json({
            success: true,
            message: `Đã trang bị ${skin.name}!`,
            skinId: skinId,
            stats: {
                maxHp: newMaxHp,
                hp: newHp,
                maxMp: newMaxMp,
                mp: newMp,
                attack: newAttack,
                defense: newDefense
            }
        });

    } catch (error: any) {
        console.error('Equip skin error:', error);
        return NextResponse.json(
            { error: 'Lỗi server khi trang bị skin' },
            { status: 500 }
        );
    }
}
