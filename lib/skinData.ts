// Skin Data - Danh sách các skin có trong game

export interface SkinData {
    id: string;
    name: string;
    description: string;
    price: number;
    assetPath: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    isDefault: boolean;
}

export const SKINS: Record<string, SkinData> = {
    knight: {
        id: 'knight',
        name: 'Hiệp Sĩ',
        description: 'Trang phục hiệp sĩ cơ bản',
        price: 0,
        assetPath: '/assets/knight',
        rarity: 'common',
        isDefault: true
    },
    warrior: {
        id: 'warrior',
        name: 'Chiến Binh',
        description: 'Trang phục chiến binh dũng mãnh',
        price: 5000,
        assetPath: '/assets/warrior',
        rarity: 'rare',
        isDefault: false
    },
    assassin: {
        id: 'assassin',
        name: 'Sát Thủ',
        description: 'Trang phục sát thủ tàng hình',
        price: 10000,
        assetPath: '/assets/assassin',
        rarity: 'epic',
        isDefault: false
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
