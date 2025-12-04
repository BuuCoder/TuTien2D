// Skin Data - Danh sách các skin có trong game

export interface SkinStats {
    maxHpBonus?: number;      // Tăng HP tối đa
    maxMpBonus?: number;      // Tăng MP tối đa
    speedBonus?: number;      // Tăng % tốc độ di chuyển
    attackBonus?: number;     // Tăng sát thương
    defenseBonus?: number;    // Tăng phòng thủ
}

export interface SkinData {
    id: string;
    name: string;
    description: string;
    price: number;
    assetPath: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    isDefault: boolean;
    stats?: SkinStats;        // Bonus stats từ skin
}

export const SKINS: Record<string, SkinData> = {
    knight: {
        id: 'knight',
        name: 'Hiệp Sĩ',
        description: 'Trang phục hiệp sĩ cơ bản',
        price: 0,
        assetPath: '/assets/knight',
        rarity: 'common',
        isDefault: true,
        stats: {
            // No bonus for default skin
        }
    },
    warrior: {
        id: 'warrior',
        name: 'Chiến Binh',
        description: 'Tăng HP và sát thương',
        price: 5000,
        assetPath: '/assets/warrior',
        rarity: 'rare',
        isDefault: false,
        stats: {
            maxHpBonus: 50,      // +50 HP
            attackBonus: 5,      // +5 Attack
            defenseBonus: 3      // +3 Defense
        }
    },
    mage: {
        id: 'mage',
        name: 'Pháp Sư',
        description: 'Tăng MP và tốc độ',
        price: 8000,
        assetPath: '/assets/mage',
        rarity: 'epic',
        isDefault: false,
        stats: {
            maxMpBonus: 100,     // +100 MP
            speedBonus: 10       // +10% Speed
        }
    },
    assassin: {
        id: 'assassin',
        name: 'Sát Thủ',
        description: 'Tăng tốc độ và sát thương',
        price: 10000,
        assetPath: '/assets/assassin',
        rarity: 'epic',
        isDefault: false,
        stats: {
            attackBonus: 300,
            maxHpBonus: 100,
            speedBonus: 100,
        }
    },
    dragon_knight: {
        id: 'dragon_knight',
        name: 'Kỵ Sĩ Rồng',
        description: 'Tăng mạnh tất cả chỉ số',
        price: 20000,
        assetPath: '/assets/dragon_knight',
        rarity: 'legendary',
        isDefault: false,
        stats: {
            maxHpBonus: 100,     // +100 HP
            maxMpBonus: 50,      // +50 MP
            speedBonus: 20,      // +20% Speed
            attackBonus: 10,     // +10 Attack
            defenseBonus: 10     // +10 Defense
        }
    }
};

export const getSkinById = (skinId: string): SkinData | undefined => {
    return SKINS[skinId];
};

export const getAllSkins = (): SkinData[] => {
    return Object.values(SKINS);
};

export const getAvailableSkins = (): SkinData[] => {
    return Object.values(SKINS).filter(skin => !skin.isDefault);
};

export const getRarityColor = (rarity: string): string => {
    switch (rarity) {
        case 'common': return '#9CA3AF';
        case 'rare': return '#3B82F6';
        case 'epic': return '#A855F7';
        case 'legendary': return '#F59E0B';
        default: return '#9CA3AF';
    }
};

export const formatSkinStats = (stats?: SkinStats): string[] => {
    if (!stats) return [];
    
    const formatted: string[] = [];
    
    if (stats.maxHpBonus) {
        formatted.push(`❤️ +${stats.maxHpBonus} HP`);
    }
    if (stats.maxMpBonus) {
        formatted.push(`💙 +${stats.maxMpBonus} MP`);
    }
    if (stats.speedBonus) {
        formatted.push(`⚡ +${stats.speedBonus}% Tốc độ`);
    }
    if (stats.attackBonus) {
        formatted.push(`⚔️ +${stats.attackBonus} Sát thương`);
    }
    if (stats.defenseBonus) {
        formatted.push(`🛡️ +${stats.defenseBonus} Phòng thủ`);
    }
    
    return formatted;
};
