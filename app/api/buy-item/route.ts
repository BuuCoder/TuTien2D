import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { itemId, itemName, price } = body;

        console.log('Purchase:', body);

        // Simulate purchase logic
        // In real app, check user balance, deduct money, add item to inventory

        return NextResponse.json({
            success: true,
            message: `Đã mua ${itemName} với giá ${price} vàng!`,
            item: body
        });
    } catch (error) {
        return NextResponse.json({
            success: false,
            error: 'Purchase failed'
        }, { status: 400 });
    }
}
