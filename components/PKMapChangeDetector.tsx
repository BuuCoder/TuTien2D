'use client';

import { useEffect, useRef } from 'react';
import { useGameStore } from '@/lib/store';
import { sendObfuscatedRequest } from '@/lib/requestObfuscator';

/**
 * Component để detect khi player chạy khỏi map trong lúc PK
 * Nếu chạy khỏi map → Xử thua
 */
const PKMapChangeDetector = () => {
    const { currentMapId, activePKSessions, socket, user, removePKSession, setNotification, setPlayerStats } = useGameStore();
    const previousMapId = useRef(currentMapId);

    useEffect(() => {
        // Check if map changed
        if (previousMapId.current !== currentMapId) {
            console.log('[PK] Map changed:', previousMapId.current, '→', currentMapId);

            // Check if in PK session
            if (activePKSessions.length > 0 && socket && user) {
                console.log('[PK] Player changed map during PK! Processing forfeit...');

                // Notify all opponents
                activePKSessions.forEach((opponentId) => {
                    // End PK session
                    removePKSession(opponentId);

                    // Notify opponent they won
                    socket.emit('pk_ended', {
                        opponentId: opponentId,
                        winner: opponentId,
                        reason: 'map_change',
                        message: `${user.username} đã chạy khỏi map!`
                    });

                    console.log('[PK] Notified opponent:', opponentId, 'of forfeit');
                });

                // Show notification to player
                setNotification({
                    message: '💀 Bạn đã thua vì chạy khỏi map!',
                    type: 'error'
                });

                // Restore HP/MP về 100% (forfeit = thua nhưng không chết)
                (async () => {
                    try {
                        const response = await sendObfuscatedRequest('/api/player/restore-hp', {
                            userId: user.id,
                            sessionId: user.sessionId,
                            token: user.socketToken
                        });

                        const data = await response.json();
                        if (data.success) {
                            setPlayerStats({
                                currentHp: data.hp,
                                maxHp: data.maxHp,
                                mp: data.mp,
                                maxMp: data.maxMp
                            });
                            console.log('[PK] HP/MP restored to 100%:', data.hp, '/', data.maxHp);
                        }
                    } catch (error) {
                        console.error('[PK] Failed to restore HP:', error);
                    }
                })();

                console.log('[PK] All PK sessions ended due to map change');
            }

            // Update previous map
            previousMapId.current = currentMapId;
        }
    }, [currentMapId, activePKSessions, socket, user, removePKSession, setNotification, setPlayerStats]);

    return null; // This component doesn't render anything
};

export default PKMapChangeDetector;
