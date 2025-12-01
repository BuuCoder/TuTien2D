// Skill system for PK

export interface Skill {
    id: string;
    name: string;
    description: string;
    manaCost: number;
    damage: number;
    cooldown: number; // milliseconds
    range: number; // pixels
    castTime: number; // milliseconds
    icon: string;
    animation?: string;
    effect?: 'stun' | 'slow' | 'burn' | 'heal';
    effectDuration?: number;
}

export const SKILLS: Record<string, Skill> = {
    // Basic Attack
    'basic-attack': {
        id: 'basic-attack',
        name: 'Đòn Thường',
        description: 'Tấn công cơ bản không tốn mana',
        manaCost: 0,
        damage: 50,
        cooldown: 2000,
        range: 80,
        castTime: 300,
        icon: '⚔️',
    },
    
    // Warrior Skills
    'slash': {
        id: 'slash',
        name: 'Chém Mạnh',
        description: 'Chém mạnh gây sát thương cao',
        manaCost: 20,
        damage: 100,
        cooldown: 5000,
        range: 100,
        castTime: 500,
        icon: '🗡️',
    },
    'charge': {
        id: 'charge',
        name: 'Xông Lên',
        description: 'Lao về phía trước gây sát thương và choáng',
        manaCost: 30,
        damage: 80,
        cooldown: 7000,
        range: 150,
        castTime: 400,
        icon: '💨',
        effect: 'stun',
        effectDuration: 1500,
    },
    
    // Mage Skills
    'fireball': {
        id: 'fireball',
        name: 'Cầu Lửa',
        description: 'Phóng cầu lửa gây sát thương phép',
        manaCost: 40,
        damage: 120,
        cooldown: 6000,
        range: 200,
        castTime: 800,
        icon: '🔥',
        effect: 'burn',
        effectDuration: 3000,
    },
    'ice-spike': {
        id: 'ice-spike',
        name: 'Gai Băng',
        description: 'Tạo gai băng làm chậm địch',
        manaCost: 35,
        damage: 90,
        cooldown: 6500,
        range: 180,
        castTime: 600,
        icon: '❄️',
        effect: 'slow',
        effectDuration: 2500,
    },
    
    // Healer Skills
    'heal': {
        id: 'heal',
        name: 'Hồi Máu',
        description: 'Hồi phục HP cho bản thân',
        manaCost: 50,
        damage: -150, // Negative = healing
        cooldown: 10000,
        range: 0,
        castTime: 1000,
        icon: '💚',
        effect: 'heal',
    },
    'holy-strike': {
        id: 'holy-strike',
        name: 'Đòn Thiêng',
        description: 'Tấn công bằng sức mạnh thiêng liêng',
        manaCost: 25,
        damage: 110,
        cooldown: 5500,
        range: 120,
        castTime: 500,
        icon: '✨',
    },
    
    // Defense Skill
    'block': {
        id: 'block',
        name: 'Phòng Thủ',
        description: 'Chặn đòn tấn công (0.1s window)',
        manaCost: 10,
        damage: 0,
        cooldown: 3000,
        range: 0,
        castTime: 100,
        icon: '🛡️',
    },
};

export interface PlayerStats {
    maxHp: number;
    currentHp: number;
    maxMana: number;
    currentMana: number;
    attack: number;
    defense: number;
    speed: number;
}

export const DEFAULT_STATS: PlayerStats = {
    maxHp: 500,
    currentHp: 500,
    maxMana: 200,
    currentMana: 200,
    attack: 10,
    defense: 5,
    speed: 5,
};

export interface SkillCooldown {
    skillId: string;
    endTime: number;
}

export interface ActiveEffect {
    type: 'stun' | 'slow' | 'burn' | 'heal';
    endTime: number;
    value?: number;
}
