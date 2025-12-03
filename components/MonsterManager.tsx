'use client';

import React, { useEffect } from 'react';
import { useGameStore } from '@/lib/store';
import { MAP_MONSTERS } from '@/lib/monsterData';
import { sendObfuscatedRequest } from '@/lib/requestObfuscator';

const MonsterManager = () => {
    const { socket, currentMapId, currentChannel, setMonsters, updateMonster, removeMonster, setNotification, addDamageIndicator, playerPosition, user } = useGameStore();

    // Setup ALL socket listeners first (before any requests)
    useEffect(() => {
        if (!socket) {
            return;
        }

        // Monster data listener
        const handleMonstersData = (data: any) => {
            const monstersMap = new Map();
            data.monsters.forEach((m: any) => {
                monstersMap.set(m.monsterId, m);
            });
            setMonsters(monstersMap);
        };

        const handleMonsterUpdated = (data: any) => {
            updateMonster(data.monsterId, data);
        };

        const handleMonsterDied = (data: any) => {
            updateMonster(data.monsterId, {
                isDead: true,
                hp: 0,
                goldDrop: data.goldDrop
            });

            setTimeout(() => {
                removeMonster(data.monsterId);
            }, 5000);
        };

        const handleMonsterRespawned = (data: any) => {
            // Re-add monster to state (it was removed after death)
            const state = useGameStore.getState();
            const newMonsters = new Map(state.monsters);
            newMonsters.set(data.monsterId, {
                ...data,
                isDead: false,
                hp: data.maxHp
            });
            setMonsters(newMonsters);
        };

        const handleMonsterAttackedPlayer = (data: any) => {
            if (data.targetSocketId === socket.id) {
                const state = useGameStore.getState();
                
                // Check if blocking - miễn nhiễm hoàn toàn
                if (state.isBlocking) {
                    setNotification({ message: '🛡️ Miễn nhiễm tấn công quái!', type: 'success' });
                    addDamageIndicator(playerPosition.x, playerPosition.y, 0);
                    
                    return; // Không nhận damage
                }
                
                // Gọi API để take damage từ monster (server validate và update database)
                (async () => {
                    try {
                        const response = await sendObfuscatedRequest('/api/player/take-damage', {
                            userId: user?.id,
                            sessionId: user?.sessionId,
                            token: user?.socketToken,
                            attackerId: null, // Monster attack
                            skillId: 'monster-attack'
                        });

                        const result = await response.json();

                        if (result.success) {
                            // Update HP từ server
                            state.setPlayerStats({ currentHp: result.hp });
                            addDamageIndicator(playerPosition.x, playerPosition.y, result.damage);
                            
                            socket.emit('update_hp', {
                                hp: result.hp,
                                maxHp: state.playerStats.maxHp
                            });

                            // Check death
                            if (result.isDead) {
                                setNotification({
                                    message: '💀 Bạn đã bị quái vật hạ gục!',
                                    type: 'error'
                                });

                                setTimeout(() => {
                                    state.setCurrentMapId('map1');
                                    state.setPlayerPosition(400, 300);
                                    state.setPlayerStats({
                                        currentHp: state.playerStats.maxHp,
                                        mp: state.playerStats.maxMp
                                    });
                                    socket.emit('update_hp', {
                                        hp: state.playerStats.maxHp,
                                        maxHp: state.playerStats.maxHp
                                    });
                                }, 3000);
                            }

                            
                        } else {
                            console.error('[Monster] Take damage API error:', result.error);
                        }
                    } catch (error) {
                        console.error('[Monster] Take damage API error:', error);
                    }
                })();
            }
        };

        // Register all listeners
        const handleGoldReceived = (data: any) => {
            // Server đã cập nhật database và gửi gold mới về
            const state = useGameStore.getState();
            
            // Update local state
            state.addGold(data.amount);
            
            // Update user object với gold từ server (đã được validate)
            if (state.user && data.newGold !== undefined) {
                state.setUser({
                    ...state.user,
                    gold: data.newGold  // Gold từ server (đã lưu vào database)
                });
                
                
            }
            
            state.setNotification({
                message: `+${data.amount} 💰 vàng!`,
                type: 'success'
            });
        };

        const handleGoldPickedUp = (data: any) => {
            // Someone picked up gold - remove from all clients
            removeMonster(data.monsterId);
        };

        socket.on('monsters_data', handleMonstersData);
        socket.on('monster_updated', handleMonsterUpdated);
        socket.on('monster_died', handleMonsterDied);
        socket.on('monster_respawned', handleMonsterRespawned);
        socket.on('monster_attacked_player', handleMonsterAttackedPlayer);
        socket.on('gold_received', handleGoldReceived);
        socket.on('gold_picked_up', handleGoldPickedUp);

        return () => {
            socket.off('monsters_data', handleMonstersData);
            socket.off('monster_updated', handleMonsterUpdated);
            socket.off('monster_died', handleMonsterDied);
            socket.off('monster_respawned', handleMonsterRespawned);
            socket.off('monster_attacked_player', handleMonsterAttackedPlayer);
            socket.off('gold_received', handleGoldReceived);
            socket.off('gold_picked_up', handleGoldPickedUp);
        };
    }, [socket, setMonsters, updateMonster, removeMonster, setNotification, addDamageIndicator, playerPosition]);

    // Request monsters when map OR channel changes
    useEffect(() => {
        if (!socket || !socket.connected || !currentChannel) {
            return;
        }
        
        
        
        // Clear old monsters
        setMonsters(new Map());

        // Small delay to ensure listener is ready
        setTimeout(() => {
            socket.emit('request_monsters', { mapId: currentMapId });
        }, 100);
    }, [currentMapId, currentChannel, socket, setMonsters]);

    // Auto-disable PK mode when no monsters nearby
    useEffect(() => {
        const checkNearbyMonsters = setInterval(() => {
            const state = useGameStore.getState();
            if (!state.isPKMode) return;

            const monsters = state.monsters;
            const playerPos = state.playerPosition;
            const activePKSessions = state.activePKSessions;

            // Don't disable if in active PK with players
            if (activePKSessions.length > 0) return;

            let hasNearbyMonster = false;
            monsters.forEach((monster) => {
                if (monster.isDead) return;

                const distance = Math.sqrt(
                    Math.pow(playerPos.x - monster.x, 2) + 
                    Math.pow(playerPos.y - monster.y, 2)
                );

                if (distance < (monster.aggroRange || 150)) {
                    hasNearbyMonster = true;
                }
            });

            // Disable PK mode if no monsters nearby
            if (!hasNearbyMonster) {
                state.setIsPKMode(false);
            }
        }, 2000); // Check every 2s

        return () => clearInterval(checkNearbyMonsters);
    }, []);

    return null; // Logic-only component
};

export default MonsterManager;
