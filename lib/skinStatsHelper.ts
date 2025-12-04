// Helper functions để áp dụng skin stats vào gameplay

import { SKINS, SkinStats } from './skinData';

// Base stats của player (không có skin bonus)
export const BASE_STATS = {
    maxHp: 500,
    maxMp: 200,
    attack: 10,
    defense: 5,
    speed: 5, // Base speed
};

/**
 * Lấy stats của skin
 */
export const getSkinStats = (skinId: string): SkinStats => {
    const skin = SKINS[skinId];
    return skin?.stats || {};
};

/**
 * Tính toán stats cuối cùng với skin bonuses
 * Note: attackBonus là % nên không cộng vào base attack
 */
export const calculatePlayerStats = (skinId: string = 'knight') => {
    const skinStats = getSkinStats(skinId);
    
    return {
        maxHp: BASE_STATS.maxHp + (skinStats.maxHpBonus || 0),
        maxMp: BASE_STATS.maxMp + (skinStats.maxMpBonus || 0),
        attack: BASE_STATS.attack, // Base attack, không cộng bonus
        defense: BASE_STATS.defense + (skinStats.defenseBonus || 0),
        attackBonusPercent: skinStats.attackBonus || 0 // Return % bonus
    };
};

/**
 * Tính toán tốc độ di chuyển với skin bonus
 */
export const calculatePlayerSpeed = (skinId: string = 'knight'): number => {
    const skinStats = getSkinStats(skinId);
    const speedBonus = skinStats.speedBonus || 0;
    
    // Áp dụng % bonus
    return BASE_STATS.speed * (1 + speedBonus / 100);
};

/**
 * Kiểm tra xem có cần update stats không (khi đổi skin)
 */
export const shouldUpdateStats = (oldSkinId: string, newSkinId: string): boolean => {
    return oldSkinId !== newSkinId;
};
