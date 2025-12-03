import db from '@/lib/db';
import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt.mjs';
import { parseRequestBody } from '@/lib/deobfuscateMiddleware';

export async function POST(req) {
    try {
        const { userId, sessionId, token } = await parseRequestBody(req);

        console.log('[Logout] Request:', { userId, sessionId });

        if (!token) {
            return NextResponse.json(
                { error: 'Token không được cung cấp' },
                { status: 401 }
            );
        }

        // Verify token
        const tokenResult = verifyToken(token);
        if (!tokenResult.valid) {
            console.log('[Logout] Token invalid, but allowing logout');
            // Vẫn cho phép logout ngay cả khi token invalid
        }

        // Verify token data matches (nếu token valid)
        if (tokenResult.valid && 
            (tokenResult.data.userId !== userId || tokenResult.data.sessionId !== sessionId)) {
            return NextResponse.json(
                { error: 'Thông tin xác thực không khớp' },
                { status: 401 }
            );
        }

        // Clear active session in database
        await db.query(
            'UPDATE users SET active_session_id = NULL WHERE id = ?',
            [userId]
        );

        console.log('[Logout] User logged out successfully:', userId);

        return NextResponse.json({
            success: true,
            message: 'Đăng xuất thành công'
        });

    } catch (error) {
        console.error('Logout error:', error);
        return NextResponse.json(
            { error: 'Lỗi server: ' + error.message },
            { status: 500 }
        );
    }
}
