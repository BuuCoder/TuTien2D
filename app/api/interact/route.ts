import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        console.log('Interaction recorded:', body);

        // NPC responses and menus
        const npcData: Record<string, { message: string; menu?: any[] }> = {
            'merchant': {
                message: 'Welcome to my shop! What would you like to buy?',
                menu: [
                    {
                        id: 'weapons',
                        name: 'Vũ khí',
                        items: [
                            { id: 'sword1', name: 'Kiếm sắt', price: 100, image: '⚔️' },
                            { id: 'sword2', name: 'Kiếm vàng', price: 500, image: '🗡️' },
                            { id: 'bow1', name: 'Cung gỗ', price: 150, image: '🏹' },
                        ]
                    },
                    {
                        id: 'potions',
                        name: 'Thuốc',
                        items: [
                            { id: 'hp1', name: 'Thuốc HP nhỏ', price: 20, image: '🧪' },
                            { id: 'hp2', name: 'Thuốc HP lớn', price: 50, image: '⚗️' },
                            { id: 'mp1', name: 'Thuốc MP', price: 30, image: '💙' },
                        ]
                    }
                ]
            },
            'healer': {
                message: 'I can heal your wounds. What do you need?',
                menu: [
                    {
                        id: 'healing',
                        name: 'Hồi phục',
                        items: [
                            { id: 'heal-hp', name: 'Hồi HP đầy', price: 50, image: '❤️' },
                            { id: 'heal-mp', name: 'Hồi MP đầy', price: 40, image: '💙' },
                            { id: 'heal-all', name: 'Hồi toàn bộ', price: 80, image: '✨' },
                        ]
                    }
                ]
            },
            'village-elder': {
                message: 'Welcome, traveler! I am the village elder. How may I help you?',
                menu: [
                    {
                        id: 'quests',
                        name: 'Nhiệm vụ',
                        items: [
                            { id: 'quest1', name: 'Tìm kho báu', price: 0, image: '📜' },
                            { id: 'quest2', name: 'Diệt quái vật', price: 0, image: '⚔️' },
                        ]
                    }
                ]
            },
            'guard': {
                message: 'Halt! State your business in this area.',
            },
        };

        const data = npcData[body.npcId] || { message: 'Hello, adventurer!' };

        return NextResponse.json({
            success: true,
            data: body,
            message: data.message,
            menu: data.menu || null,
            npcId: body.npcId
        });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
    }
}
