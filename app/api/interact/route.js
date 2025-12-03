import { NextResponse } from 'next/server';
import { NPC_DATA } from '@/lib/npcData';

/**
 * API: NPC Interaction
 * Handle player interactions with NPCs
 * NOTE: Public API - không cần obfuscation
 */
export async function POST(req) {
    try {
        const { npcId, action, timestamp } = await req.json();

        console.log('[Interact] Request:', { npcId, action, timestamp });

        // Lấy data từ NPC_DATA
        const npcData = NPC_DATA[npcId];
        
        if (!npcData) {
            return NextResponse.json(
                { error: 'NPC không tồn tại' },
                { status: 404 }
            );
        }

        // Response theo format của npcData
        const response = {
            success: true,
            npcId,
            message: npcData.message,
            timestamp: new Date().toISOString()
        };

        // Thêm menu nếu có
        if (npcData.menu && npcData.menu.length > 0) {
            response.menu = npcData.menu;
        }

        // Thêm quests nếu có
        if (npcData.quests && npcData.quests.length > 0) {
            response.quests = npcData.quests;
        }

        return NextResponse.json(response);

    } catch (error) {
        console.error('Interact error:', error);
        return NextResponse.json(
            { error: 'Lỗi server: ' + error.message },
            { status: 500 }
        );
    }
}
