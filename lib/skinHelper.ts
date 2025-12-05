// Helper functions for skin-related calculations

import { getSkinById } from './skinData';

/**
 * Lấy vị trí trung tâm thực sự của nhân vật dựa trên skin
 * @param skinId - ID của skin
 * @param x - Tọa độ x hiện tại (góc trên-trái)
 * @param y - Tọa độ y hiện tại (góc trên-trái)
 * @returns Tọa độ trung tâm thực sự { x, y }
 */
export const getPlayerCenter = (skinId: string, x: number, y: number): { x: number; y: number } => {
    const skinData = getSkinById(skinId);
    const displaySize = skinData?.displaySize || 64;
    
    // Tính offset: (displaySize - 64) / 2
    // Với assassin: (300 - 64) / 2 = 118
    const offsetY = (displaySize - 64) / 2;
    
    return {
        x: x,
        y: y + offsetY
    };
};

/**
 * Tính khoảng cách giữa 2 điểm
 */
export const calculateDistance = (x1: number, y1: number, x2: number, y2: number): number => {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
};

/**
 * Tính khoảng cách từ player đến target, có tính đến centerOffset của skin
 */
export const calculatePlayerDistance = (
    playerSkinId: string,
    playerX: number,
    playerY: number,
    targetX: number,
    targetY: number
): number => {
    const playerCenter = getPlayerCenter(playerSkinId, playerX, playerY);
    return calculateDistance(playerCenter.x, playerCenter.y, targetX, targetY);
};
