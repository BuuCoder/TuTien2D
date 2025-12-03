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

        // Lấy stats
        const [stats] = await db.query(
            'SELECT * FROM user_stats WHERE user_id = ?',
            [user.id]
        );

        // Tạo JWT token cho socket authentication
        const socketToken = generateToken(user.id, user.username, sessionId);

        return NextResponse.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            },
            sessionId,
            socketToken, // Token mã hóa cho socket
            inventory: inventory[0] || { gold: 0, items: [] },
            stats: stats[0] || { level: 1, experience: 0, hp: 100, max_hp: 100 }
        });

    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json(
            { error: 'Lỗi server: ' + error.message },
            { status: 500 }
        );
    }
}
