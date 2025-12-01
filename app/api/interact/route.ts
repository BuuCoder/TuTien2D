import { NextResponse } from 'next/server';
import { NPC_DATA } from '@/lib/npcData';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        console.log('Interaction recorded:', body);

        // Get NPC data from the new system
        const data = NPC_DATA[body.npcId] || { 
            message: 'Xin chào, dũng sĩ!',
            menu: null,
            quests: null
        };

        return NextResponse.json({
            success: true,
            data: body,
            message: data.message,
            menu: data.menu || null,
            quests: data.quests || null,
            npcId: body.npcId
        });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
    }
}
