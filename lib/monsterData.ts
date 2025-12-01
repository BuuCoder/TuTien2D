// Monster system data

export interface MonsterConfig {
    id: string;
    name: string;
    level: number;
    hp: number;
    maxHp: number;
    attack: number;
    defense: number;
    goldDrop: number;
    expDrop: number;
    attackRange: number;
    aggroRange: number;
    sprite: string;
    x: number;
    y: number;
}

export interface MonsterSpawn {
    monsterId: string;
    name: string;
    level: number;
    maxHp: number;
    attack: number;
    defense: number;
    goldDrop: number;
    expDrop: number;
    attackRange: number;
    aggroRange: number;
    sprite: string;
    x: number;
    y: number;
}

// Monster templates
export const MONSTER_TEMPLATES: Record<string, Omit<MonsterSpawn, 'x' | 'y' | 'monsterId'>> = {
    'slime': {
        name: 'Slime Xanh',
        level: 1,
        maxHp: 100,
        attack: 10,
        defense: 2,
        goldDrop: 5,
        expDrop: 10,
        attackRange: 60,
        aggroRange: 150,
        sprite: '/assets/monster/monster.gif',
    },
    'goblin': {
        name: 'Goblin',
        level: 3,
        maxHp: 200,
        attack: 25,
        defense: 5,
        goldDrop: 15,
        expDrop: 30,
        attackRange: 80,
        aggroRange: 180,
        sprite: '/assets/monster/monster.gif',
    },
    'orc': {
        name: 'Orc Chiến Binh',
        level: 5,
        maxHp: 350,
        attack: 40,
        defense: 10,
        goldDrop: 30,
        expDrop: 50,
        attackRange: 90,
        aggroRange: 200,
        sprite: '/assets/monster/monster.gif',
    },
    'wolf': {
        name: 'Sói Rừng',
        level: 4,
        maxHp: 250,
        attack: 35,
        defense: 8,
        goldDrop: 20,
        expDrop: 40,
        attackRange: 70,
        aggroRange: 220,
        sprite: '/assets/monster/monster.gif',
    },
    'skeleton': {
        name: 'Bộ Xương',
        level: 6,
        maxHp: 400,
        attack: 50,
        defense: 12,
        goldDrop: 40,
        expDrop: 60,
        attackRange: 85,
        aggroRange: 190,
        sprite: '/assets/monster/monster.gif',
    },
    'dragon': {
        name: 'Rồng Nhỏ',
        level: 10,
        maxHp: 800,
        attack: 100,
        defense: 25,
        goldDrop: 100,
        expDrop: 150,
        attackRange: 120,
        aggroRange: 250,
        sprite: '/assets/monster/monster.gif',
    },
};

// Monster spawns per map
export const MAP_MONSTERS: Record<string, MonsterSpawn[]> = {
    'map2': [ // Rừng Hắc Ám
        { ...MONSTER_TEMPLATES['slime'], monsterId: 'map2-slime-1', x: 300, y: 400 },
        { ...MONSTER_TEMPLATES['slime'], monsterId: 'map2-slime-2', x: 500, y: 600 },
        { ...MONSTER_TEMPLATES['goblin'], monsterId: 'map2-goblin-1', x: 800, y: 300 },
        { ...MONSTER_TEMPLATES['wolf'], monsterId: 'map2-wolf-1', x: 1000, y: 700 },
    ],
    'map3': [ // Thành Chủ - ít monster
        { ...MONSTER_TEMPLATES['goblin'], monsterId: 'map3-goblin-1', x: 1200, y: 900 },
    ],
    'map4': [ // Đồng Cỏ
        { ...MONSTER_TEMPLATES['slime'], monsterId: 'map4-slime-1', x: 400, y: 500 },
        { ...MONSTER_TEMPLATES['goblin'], monsterId: 'map4-goblin-1', x: 900, y: 400 },
        { ...MONSTER_TEMPLATES['orc'], monsterId: 'map4-orc-1', x: 1200, y: 800 },
        { ...MONSTER_TEMPLATES['wolf'], monsterId: 'map4-wolf-1', x: 600, y: 900 },
    ],
    'map5': [ // Hang Động - monsters mạnh
        { ...MONSTER_TEMPLATES['orc'], monsterId: 'map5-orc-1', x: 400, y: 400 },
        { ...MONSTER_TEMPLATES['skeleton'], monsterId: 'map5-skeleton-1', x: 700, y: 600 },
        { ...MONSTER_TEMPLATES['skeleton'], monsterId: 'map5-skeleton-2', x: 900, y: 300 },
        { ...MONSTER_TEMPLATES['dragon'], monsterId: 'map5-dragon-1', x: 600, y: 700 },
    ],
};
