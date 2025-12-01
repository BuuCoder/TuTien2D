export interface Portal {
    x: number;
    y: number;
    targetMap: string;
    targetX: number;
    targetY: number;
    label: string;
}

export interface NPCConfig {
    id: string;
    x: number;
    y: number;
    type: string;
}

export interface MapConfig {
    id: string;
    name: string;
    width: number;
    height: number;
    background: string;
    npcs: NPCConfig[];
    portals: Portal[];
}

export const MAPS: Record<string, MapConfig> = {
    'map1': {
        id: 'map1',
        name: 'Làng Tân Thủ',
        width: 1200,
        height: 900,
        background: '/assets/background/background_01.jpeg', // Làng yên bình
        npcs: [
            { id: 'merchant', x: 600, y: 300, type: 'merchant' },
            { id: 'healer', x: 900, y: 600, type: 'healer' },
            { id: 'elder', x: 300, y: 700, type: 'village-elder' }
        ],
        portals: [
            { x: 1150, y: 450, targetMap: 'map2', targetX: 150, targetY: 450, label: 'Rừng Hắc Ám' }
        ]
    },
    'map2': {
        id: 'map2',
        name: 'Rừng Hắc Ám',
        width: 1400,
        height: 1000,
        background: '/assets/background/background_04.jpeg', // Rừng tối
        npcs: [
            { id: 'forest-guard', x: 700, y: 500, type: 'guard' }
        ],
        portals: [
            { x: 50, y: 450, targetMap: 'map1', targetX: 1050, targetY: 450, label: 'Làng Tân Thủ' },
            { x: 1350, y: 500, targetMap: 'map3', targetX: 150, targetY: 450, label: 'Thành Chủ' }
        ]
    },
    'map3': {
        id: 'map3',
        name: 'Thành Chủ',
        width: 1600,
        height: 1200,
        background: '/assets/background/background_02.jpeg', // Thành phố
        npcs: [
            { id: 'city-merchant', x: 400, y: 400, type: 'merchant' },
            { id: 'city-healer', x: 800, y: 600, type: 'healer' },
            { id: 'city-guard-1', x: 200, y: 300, type: 'guard' },
            { id: 'city-guard-2', x: 1400, y: 300, type: 'guard' }
        ],
        portals: [
            { x: 50, y: 450, targetMap: 'map2', targetX: 1250, targetY: 500, label: 'Rừng Hắc Ám' },
            { x: 800, y: 1150, targetMap: 'map4', targetX: 800, targetY: 150, label: 'Đồng Cỏ' }
        ]
    },
    'map4': {
        id: 'map4',
        name: 'Đồng Cỏ Xanh',
        width: 1600,
        height: 1200,
        background: '/assets/background/background_03.png', // Đồng cỏ
        npcs: [
            { id: 'farmer', x: 800, y: 600, type: 'village-elder' }
        ],
        portals: [
            { x: 800, y: 50, targetMap: 'map3', targetX: 800, targetY: 1050, label: 'Thành Chủ' },
            { x: 1550, y: 600, targetMap: 'map5', targetX: 150, targetY: 450, label: 'Hang Động' }
        ]
    },
    'map5': {
        id: 'map5',
        name: 'Hang Động Bí Ẩn',
        width: 1200,
        height: 900,
        background: '/assets/background/background_05.png', // Hang động
        npcs: [
            { id: 'cave-merchant', x: 600, y: 450, type: 'merchant' }
        ],
        portals: [
            { x: 50, y: 450, targetMap: 'map4', targetX: 1450, targetY: 600, label: 'Đồng Cỏ' }
        ]
    }
};
