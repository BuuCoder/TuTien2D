'use client';

import { useEffect, useRef } from 'react';
import { useGameStore } from '@/lib/store';

/**
 * Component tự động lưu HP/Mana vào database mỗi 10 giây
 */
const AutoSaveStats = () => {
    const { user, playerStats } = useGameStore();
    const lastSaveTime = useRef(0);
    const saveInterval = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!user || !user.socketToken) {
            console.log('[AutoSave] No user or token, skipping auto-save');
            return;
        }

        console.log('[AutoSave] Starting auto-save for user:', user.username);

        // Auto-save mỗi 10 giây
        saveInterval.current = setInterval(async () => {
            const now = Date.now();
            
            // Chỉ save nếu đã qua 10s và HP/Mana có thay đổi
            if (now - lastSaveTime.current < 10000) return;

            try {
                const response = await fetch('/api/player/update-stats', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: user.id,
                        sessionId: user.sessionId,
                        token: user.socketToken,
                        currentHp: playerStats.currentHp,
                        currentMana: playerStats.currentMana,
                    })
                });

                if (response.ok) {
                    lastSaveTime.current = now;
                    console.log('[AutoSave] Stats saved:', {
                        hp: playerStats.currentHp,
                        mana: playerStats.currentMana
                    });
                } else {
                    const errorData = await response.json();
                    console.error('[AutoSave] Failed to save stats:', response.status, errorData);
                }
            } catch (error) {
                console.error('[AutoSave] Failed to save stats:', error);
            }
        }, 10000); // 10 giây

        return () => {
            if (saveInterval.current) {
                clearInterval(saveInterval.current);
            }
        };
    }, [user, playerStats.currentHp, playerStats.currentMana]);

    // Save khi unmount (đóng tab/logout)
    useEffect(() => {
        if (!user) return;

        const saveStats = async () => {
            try {
                await fetch('/api/player/update-stats', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: user.id,
                        sessionId: user.sessionId,
                        token: user.socketToken,
                        currentHp: playerStats.currentHp,
                        currentMana: playerStats.currentMana,
                    }),
                    keepalive: true // Đảm bảo request hoàn thành khi đóng tab
                });
                console.log('[AutoSave] Stats saved on unmount');
            } catch (error) {
                console.error('[AutoSave] Failed to save on unmount:', error);
            }
        };

        const handleBeforeUnload = () => {
            // Sử dụng sendBeacon với Blob để set Content-Type
            const data = JSON.stringify({
                userId: user.id,
                sessionId: user.sessionId,
                token: user.socketToken,
                currentHp: playerStats.currentHp,
                currentMana: playerStats.currentMana,
            });

            const blob = new Blob([data], { type: 'application/json' });
            navigator.sendBeacon('/api/player/update-stats', blob);
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            // Save one last time when component unmounts
            saveStats();
        };
    }, [user, playerStats.currentHp, playerStats.currentMana]);

    return null; // Component không render gì
};

export default AutoSaveStats;
