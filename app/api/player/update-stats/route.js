import db from '@/lib/db';
import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt.mjs';

export async function POST(req) {
    try {
        const { userId, sessionId, token, currentHp, currentMana } = await req.json();

        // Debug logging
        console.log('[UpdateStats] Request:', { userId, sessionId, hasToken: !!token, currentHp, currentMana });

        if (!token) {
            console.log('[UpdateStats] No token provided');
            return NextResponse.json(
                { error: 'Token không được cung cấp' },
                { status: 401 }
            );
        }

        // Verify token
        const tokenResult = verifyToken(token);
        if (!tokenResult.valid) {
            console.log('[UpdateStats] Token invalid:', tokenResult.error);
            return NextResponse.json(
                { error: 'Token không hợp lệ: ' + tokenResult.error },
                { status: 401 }
            );
        }

        // Verify token data matches
        if (tokenResult.data.userId !== userId || tokenResult.data.sessionId !== sessionId) {
            console.log('[UpdateStats] Token data mismatch:', {
                tokenUserId: tokenResult.data.userId,
                requestUserId: userId,
                tokenSessionId: tokenResult.data.sessionId,
                requestSessionId: sessionId
            });
            return NextResponse.json(
                { error: 'Thông tin xác thực không khớp' },
                { status: 401 }
            );
        }

        // Update stats in database
        await db.query(
            'UPDATE user_stats SET hp = ?, mp = ? WHERE user_id = ?',
            [currentHp, currentMana, userId]
        );

        console.log('[UpdateStats] Stats updated successfully for user', userId);

        return NextResponse.json({
            success: true,
            message: 'Stats updated'
        });

    } catch (error) {
        console.error('Update stats error:', error);
        return NextResponse.json(
            { error: 'Lỗi server: ' + error.message },
            { status: 500 }
        );
    }
}
