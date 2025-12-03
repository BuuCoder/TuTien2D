'use client';

import { useEffect } from 'react';
import { useGameStore } from '@/lib/store';

/**
 * Component này KHÔNG CÒN tự động lưu HP/MP nữa
 * 
 * HP/MP được tự động cập nhật qua các API chuyên dụng:
 * - /api/player/heal - Khi hồi phục HP
 * - /api/player/use-skill - Khi dùng skill (trừ MP)
 * - /api/player/take-damage - Khi nhận damage (trừ HP)
 * 
 * Component này chỉ còn để save gold/items nếu cần trong tương lai
 */
const AutoSaveStats = () => {
    const { user } = useGameStore();

    useEffect(() => {
        if (!user || !user.socketToken) {
            return;
        }

        
        
        
        
        

        // TODO: Implement gold/items auto-save if needed
        
    }, [user]);

    return null; // Component không render gì
};

export default AutoSaveStats;

