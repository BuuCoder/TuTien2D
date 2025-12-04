import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import { parseRequestBody } from '@/lib/deobfuscateMiddleware';
import { SKINS } from '@/lib/skinData';
import { calculatePlayerStats } from '@/lib/skinStatsHelper';

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

        // Lấy current stats và old skin từ DB
        const [currentStats] = await db.query(
            'SELECT hp, max_hp, mp, max_mp FROM user_stats WHERE user_id = ?',
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

        // Tính % HP/MP hiện tại
        const hpPercent = oldStats.hp / oldStats.max_hp;
        const mpPercent = oldStats.mp / oldStats.max_mp;

        // Lấy bonuses từ old skin và new skin
        const oldSkinData = SKINS[oldSkinId];
        const newSkinData = SKINS[skinId];
        
        const oldHpBonus = oldSkinData?.stats?.maxHpBonus || 0;
        const oldMpBonus = oldSkinData?.stats?.maxMpBonus || 0;
        const newHpBonus = newSkinData?.stats?.maxHpBonus || 0;
        const newMpBonus = newSkinData?.stats?.maxMpBonus || 0;

        // Tính base max HP/MP (loại bỏ old skin bonus)
        const baseMaxHp = oldStats.max_hp - oldHpBonus;
        const baseMaxMp = oldStats.max_mp - oldMpBonus;

        // Tính new max HP/MP (thêm new skin bonus)
        const newMaxHp = baseMaxHp + newHpBonus;
        const newMaxMp = baseMaxMp + newMpBonus;

        // Tính HP/MP mới dựa trên % (giữ nguyên %)
        const newHp = Math.floor(newMaxHp * hpPercent);
        const newMp = Math.floor(newMaxMp * mpPercent);

        // Lấy attack/defense từ new skin
        const newSkinStats = calculatePlayerStats(skinId);

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

        // Update max HP/MP và current HP/MP trong database
        await db.query(
            'UPDATE user_stats SET max_hp = ?, hp = ?, max_mp = ?, mp = ? WHERE user_id = ?',
            [newMaxHp, newHp, newMaxMp, newMp, userId]
        );

        console.log(`[SkinEquip] User ${userId} equipped ${skinId}:`, {
            oldSkin: oldSkinId,
            newSkin: skinId,
            oldMaxHp: oldStats.max_hp,
            oldHpBonus: oldHpBonus,
            baseMaxHp: baseMaxHp,
            newHpBonus: newHpBonus,
            newMaxHp: newMaxHp,
            oldMaxMp: oldStats.max_mp,
            oldMpBonus: oldMpBonus,
            baseMaxMp: baseMaxMp,
            newMpBonus: newMpBonus,
            newMaxMp: newMaxMp,
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
                attack: newSkinStats.attack,
                defense: newSkinStats.defense
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
