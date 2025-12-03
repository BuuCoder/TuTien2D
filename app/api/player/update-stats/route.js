import db from '@/lib/db';
import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt.mjs';
import { parseRequestBody } from '@/lib/deobfuscateMiddleware';

export async function POST(req) {
    try {
        const { userId, sessionId, token, gold, items } = await parseRequestBody(req);

        // Debug logging
        console.log('[UpdateStats] Request:', { userId, sessionId, hasToken: !!token });

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

        // CHỈ cho phép cập nhật gold và items, KHÔNG cho phép cập nhật HP/MP
        // HP/MP chỉ được cập nhật qua các API chuyên dụng: heal, use-skill, take-damage
        if (gold !== undefined || items !== undefined) {
            const updates = [];
            const values = [];

            if (gold !== undefined) {
                updates.push('gold = ?');
                values.push(gold);
            }

            if (items !== undefined) {
                updates.push('items = ?');
                values.push(JSON.stringify(items));
            }

            if (updates.length > 0) {
                values.push(userId);
                await db.query(
                    `UPDATE user_inventory SET ${updates.join(', ')} WHERE user_id = ?`,
                    values
                );
            }
        }

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
