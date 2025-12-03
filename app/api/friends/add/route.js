import db from '@/lib/db';
import { NextResponse } from 'next/server';
import { parseRequestBody } from '@/lib/deobfuscateMiddleware';

export async function POST(req) {
    try {
        const { userId1, userId2 } = await parseRequestBody(req);

        if (!userId1 || !userId2) {
            return NextResponse.json(
                { error: 'userId1 và userId2 là bắt buộc' },
                { status: 400 }
            );
        }

        // Kiểm tra xem đã là bạn bè chưa
        const [existing] = await db.query(
            `SELECT * FROM friends 
             WHERE (user_id_1 = ? AND user_id_2 = ?) 
             OR (user_id_1 = ? AND user_id_2 = ?)`,
            [userId1, userId2, userId2, userId1]
        );

        if (existing.length > 0) {
            // Nếu đã tồn tại, update status thành accepted
            await db.query(
                `UPDATE friends SET status = 'accepted', updated_at = NOW() 
                 WHERE (user_id_1 = ? AND user_id_2 = ?) 
                 OR (user_id_1 = ? AND user_id_2 = ?)`,
                [userId1, userId2, userId2, userId1]
            );
        } else {
            // Tạo mới friendship
            await db.query(
                'INSERT INTO friends (user_id_1, user_id_2, status) VALUES (?, ?, ?)',
                [userId1, userId2, 'accepted']
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Đã kết bạn thành công!'
        });

    } catch (error) {
        console.error('Add friend error:', error);
        return NextResponse.json(
            { error: 'Lỗi server: ' + error.message },
            { status: 500 }
        );
    }
}
