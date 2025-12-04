import db from '@/lib/db';
import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { generateToken } from '@/lib/jwt.mjs';
import { parseRequestBody } from '@/lib/deobfuscateMiddleware';

export async function POST(req) {
    try {
        const { username, password } = await parseRequestBody(req);

        if (!username || !password) {
            return NextResponse.json(
                { error: 'Username và password là bắt buộc' },
                { status: 400 }
            );
        }

        // Kiểm tra user trong database
        const [users] = await db.query(
            'SELECT * FROM users WHERE username = ? AND password = ?',
            [username, password]
        );

        if (users.length === 0) {
            return NextResponse.json(
                { error: 'Tên đăng nhập hoặc mật khẩu không đúng' },
                { status: 401 }
            );
        }

        const user = users[0];

        // Tạo session ID mới
        const sessionId = crypto.randomBytes(32).toString('hex');

        // Kiểm tra nếu user đã có session active
        if (user.active_session_id) {
            console.log(`User ${username} has active session: ${user.active_session_id}`);
        }

        // Update session ID và last login
        await db.query(
            'UPDATE users SET active_session_id = ?, last_login = NOW() WHERE id = ?',
            [sessionId, user.id]
        );

        // Lấy inventory
        const [inventory] = await db.query(
            'SELECT * FROM user_inventory WHERE user_id = ?',
            [user.id]
        );

        // Lấy stats (bao gồm base stats)
        const [stats] = await db.query(
            'SELECT * FROM user_stats WHERE user_id = ?',
            [user.id]
        );

        // Tạo JWT token cho socket authentication
        const socketToken = generateToken(user.id, user.username, sessionId);

        const dbStats = stats[0];
        
        // Nếu không có stats, tạo default
        if (!dbStats) {
            const userStats = { 
                level: 1, 
                experience: 0, 
                hp: 500, 
                max_hp: 500,
                mp: 200,
                max_mp: 200,
                attack: 10,
                defense: 5,
                speed: 5.00,
                base_max_hp: 500,
                base_max_mp: 200,
                base_attack: 10,
                base_defense: 5,
                base_speed: 5.00
            };
            
            return NextResponse.json({
                success: true,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    skin: user.skin || 'knight'
                },
                sessionId,
                socketToken,
                inventory: inventory[0] || { gold: 0, items: [] },
                stats: userStats
            });
        }

        // Tính lại final stats từ base stats + skin bonus
        const { SKINS } = require('@/lib/skinData');
        const skinId = user.skin || 'knight';
        const skinData = SKINS[skinId];
        
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

        // Tính % HP/MP hiện tại
        const hpPercent = dbStats.hp / dbStats.max_hp;
        const mpPercent = dbStats.mp / dbStats.max_mp;
        const finalHp = Math.floor(finalMaxHp * hpPercent);
        const finalMp = Math.floor(finalMaxMp * mpPercent);

        // Update final stats vào DB
        await db.query(
            'UPDATE user_stats SET max_hp = ?, hp = ?, max_mp = ?, mp = ?, attack = ?, defense = ?, speed = ? WHERE user_id = ?',
            [finalMaxHp, finalHp, finalMaxMp, finalMp, finalAttack, finalDefense, finalSpeed, user.id]
        );

        console.log(`[Login] User ${user.id} (${user.username}) recalculated stats:`, {
            skinId,
            baseAttack,
            finalAttack,
            baseDefense,
            finalDefense
        });

        const userStats = {
            level: dbStats.level || 1,
            experience: dbStats.experience || 0,
            hp: finalHp,
            max_hp: finalMaxHp,
            mp: finalMp,
            max_mp: finalMaxMp,
            attack: finalAttack,
            defense: finalDefense,
            speed: finalSpeed,
            base_max_hp: baseMaxHp,
            base_max_mp: baseMaxMp,
            base_attack: baseAttack,
            base_defense: baseDefense,
            base_speed: baseSpeed
        };

        return NextResponse.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                skin: skinId
            },
            sessionId,
            socketToken,
            inventory: inventory[0] || { gold: 0, items: [] },
            stats: userStats
        });

    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json(
            { error: 'Lỗi server: ' + error.message },
            { status: 500 }
        );
    }
}
