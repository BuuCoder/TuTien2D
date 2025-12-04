'use client';

import React, { useEffect, useCallback } from 'react';
import { useGameStore } from '@/lib/store';
import { SKILLS } from '@/lib/skillData';
import { generateRequestId } from '@/lib/requestId';
import { sendObfuscatedRequest } from '@/lib/requestObfuscator';

const CombatManager = () => {
    const { 
        socket, 
        playerStats, 
        setPlayerStats,
        addSkillCooldown,
        addDamageIndicator,
        playerPosition,
        otherPlayers,
        updateOtherPlayer,
        isPKMode,
        addActiveEffect,
        setNotification,
        user
    } = useGameStore();

    // Helper function để emit HP update với PK check
    const emitHPUpdate = useCallback((hp: number, maxHp: number) => {
        if (!socket) return;
        
        const activeSessions = useGameStore.getState().activePKSessions;
        const opponentId = activeSessions.length > 0 ? activeSessions[0] : null;
        const isPK = opponentId !== null;
        
        socket.emit('update_hp', {
            hp,
            maxHp,
            opponentId,
            isPK
        });
    }, [socket]);

    // Handle skill usage with hotkeys and custom events
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't trigger if typing in input
            const activeElement = document.activeElement;
            if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
                return;
            }

            if (!isPKMode) return;

            const skillKeys = ['1', '2', '3', '4', '5', '6', '7'];
            const skillList = ['basic-attack', 'slash', 'charge', 'fireball', 'ice-spike', 'heal', 'holy-strike'];
            
            const keyIndex = skillKeys.indexOf(e.key);
            if (keyIndex !== -1) {
                const skillId = skillList[keyIndex];
                useSkill(skillId);
            }
        };

        const handleUseSkillEvent = (e: any) => {
            const { skillId } = e.detail;
            useSkill(skillId);
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('useSkill', handleUseSkillEvent as EventListener);
        
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('useSkill', handleUseSkillEvent as EventListener);
        };
    }, [isPKMode, playerStats, socket, playerPosition, otherPlayers]);

    const useSkill = useCallback(async (skillId: string) => {
        
        const skill = SKILLS[skillId];
        if (!skill) {
            return;
        }
        
        if (!socket) {
            return;
        }

        // Check cooldown
        const cooldowns = useGameStore.getState().skillCooldowns;
        const cooldown = cooldowns.find(cd => cd.skillId === skillId);
        if (cooldown && cooldown.endTime > Date.now()) {
            return;
        }

        // Check mana
        if (playerStats.mp < skill.manaCost) {
            setNotification({ message: 'Không đủ MP!', type: 'error' });
            return;
        }

        // Check if stunned
        const effects = useGameStore.getState().activeEffects;
        if (effects.some(e => e.type === 'stun')) {
            setNotification({ message: 'Bạn đang bị choáng!', type: 'error' });
            return;
        }

        // ===== XỬ LÝ HEAL SKILL (không cần target) =====
        if (skillId === 'heal') {
            // Gọi API để heal (server validate và update database)
            try {
                const requestId = generateRequestId(user?.id);
                
                const response = await sendObfuscatedRequest('/api/player/heal', {
                    userId: user?.id,
                    sessionId: user?.sessionId,
                    token: user?.socketToken,
                    skillId: skillId,
                    requestId: requestId  // Unique request ID
                });

                const data = await response.json();

                if (data.success) {
                    // Update stats từ server
                    setPlayerStats({ 
                        currentHp: data.hp,
                        mp: data.mp
                    });

                    // Add cooldown
                    addSkillCooldown(skillId, skill.cooldown);

                    // Visual effects
                    addDamageIndicator(playerPosition.x, playerPosition.y, -data.healed);
                    addActiveEffect({ type: 'heal', endTime: Date.now() + 1000 });

                } else {
                    setNotification({ message: data.error || 'Hồi phục thất bại', type: 'error' });
                }
            } catch (error) {
                console.error('[CombatManager] Heal API error:', error);
                setNotification({ message: 'Lỗi kết nối server', type: 'error' });
            }

            return; // Kết thúc sớm
        }

        // ===== XỬ LÝ BLOCK SKILL (không cần target) =====
        if (skillId === 'block') {
            // Consume mana
            setPlayerStats({ 
                mp: Math.max(0, playerStats.mp - skill.manaCost) 
            });

            // Add cooldown
            addSkillCooldown(skillId, skill.cooldown);

            // Activate block for 5 seconds - miễn nhiễm hoàn toàn
            useGameStore.getState().setIsBlocking(true);
            useGameStore.getState().setBlockEndTime(Date.now() + 5000);
            
            setTimeout(() => {
                useGameStore.getState().setIsBlocking(false);
                setNotification({ message: '🛡️ Hết hiệu lực phòng thủ!', type: 'info' });
            }, 5000);
            
            setNotification({ message: '🛡️ Miễn nhiễm 5 giây!', type: 'success' });
            return; // Kết thúc sớm
        }

        // ===== XỬ LÝ SKILL TẤN CÔNG (cần target) =====
        // Find nearest target (PK players or monsters)
        const activeSessions = useGameStore.getState().activePKSessions;
        const monsters = useGameStore.getState().monsters;
        
        
        // Check if has any valid target
        const hasPKTarget = activeSessions.length > 0;
        const hasMonsterTarget = Array.from(monsters.values()).some(m => !m.isDead);
        
        if (!hasPKTarget && !hasMonsterTarget) {
            setNotification({ message: 'Không có mục tiêu! Bật PK mode hoặc tìm quái gần đó.', type: 'error' });
            return;
        }
        
        let targetId = null;
        let targetType: 'player' | 'monster' = 'player';
        let minDistance = skill.range;

        // Check PK players first
        otherPlayers.forEach((player, id) => {
            if (!activeSessions.includes(id)) return;

            const distance = Math.sqrt(
                Math.pow(player.x - playerPosition.x, 2) + 
                Math.pow(player.y - playerPosition.y, 2)
            );
            
            if (distance < minDistance) {
                minDistance = distance;
                targetId = id;
                targetType = 'player';
            }
        });

        // Check monsters if no PK target
        if (!targetId) {
            monsters.forEach((monster, id) => {
                if (monster.isDead) return;

                const distance = Math.sqrt(
                    Math.pow(monster.x - playerPosition.x, 2) + 
                    Math.pow(monster.y - playerPosition.y, 2)
                );
                
                if (distance < minDistance) {
                    minDistance = distance;
                    targetId = id;
                    targetType = 'monster';
                }
            });
        }


        // Nếu không có target trong tầm
        if (!targetId) {
            setNotification({ message: 'Không có mục tiêu trong tầm!', type: 'error' });
            return;
        }

        // Gọi API để use skill (server validate MP và update database)
        try {
            const response = await sendObfuscatedRequest('/api/player/use-skill', {
                userId: user?.id,
                sessionId: user?.sessionId,
                token: user?.socketToken,
                skillId: skillId,
                targetType: targetType
            });

            const data = await response.json();

            if (!data.success) {
                setNotification({ message: data.error || 'Không thể dùng skill', type: 'error' });
                return;
            }

            // Update MP từ server
            setPlayerStats({ mp: data.mp });

            // Add cooldown
            addSkillCooldown(skillId, skill.cooldown);

            // Emit skill use với isPK flag
            const currentPKSessions = useGameStore.getState().activePKSessions;
            const isPKSkill = targetId && currentPKSessions.includes(targetId);
            
            socket.emit('use_skill', {
                skillId,
                targetId,
                position: playerPosition,
                isPK: isPKSkill
            });

        } catch (error) {
            console.error('[CombatManager] Use skill API error:', error);
            setNotification({ message: 'Lỗi kết nối server', type: 'error' });
            return;
        }

        // Calculate and apply damage to target
        if (targetId) {
            // Công thức đơn giản: Damage = DB.attack + skill_damage
            const finalDamage = playerStats.attack + skill.damage;
            
            console.log('═══════════════════════════════════════');
            console.log('🎯 [DAMAGE CALCULATION]');
            console.log('Attack (from DB):', playerStats.attack);
            console.log('Skill Damage:', skill.damage);
            console.log('FINAL DAMAGE:', finalDamage, '=', playerStats.attack, '+', skill.damage);
            console.log('Target:', targetType);
            console.log('═══════════════════════════════════════');
            
            if (targetType === 'player') {
                // Damage to player với isPK flag
                const activeSessions = useGameStore.getState().activePKSessions;
                const isPKDamage = activeSessions.includes(targetId);
                
                socket.emit('take_damage', {
                    damage: finalDamage, // Vẫn gửi để hiển thị, nhưng server sẽ tính lại
                    attackerId: socket.id,
                    attackerUserId: user?.id, // Gửi userId để server query attack từ DB
                    targetId: targetId,
                    skillId,
                    isPK: isPKDamage // Flag để server biết đây là PK
                });
            } else {
                // Damage to monster - Server sẽ tính damage dựa trên skin bonus
                socket.emit('attack_monster', {
                    monsterId: targetId,
                    skillId // Chỉ gửi skillId, server sẽ tính damage
                });
            }
        }

    }, [socket, isPKMode, playerStats, playerPosition, otherPlayers, setPlayerStats, addSkillCooldown, addDamageIndicator, setNotification, addActiveEffect]);

    // Broadcast initial HP when joining
    useEffect(() => {
        if (!socket || !user) return;

        const timer = setTimeout(() => {
            emitHPUpdate(playerStats.currentHp, playerStats.maxHp);
        }, 1000);

        return () => clearTimeout(timer);
    }, [socket, user, playerStats.maxHp]);

    // Check if player left map during PK
    useEffect(() => {
        if (!socket) return;

        const currentMapId = useGameStore.getState().currentMapId;
        const activeSessions = useGameStore.getState().activePKSessions;

        // If in active PK session and map changed, forfeit
        if (activeSessions.length > 0) {
            
            const checkMapChange = () => {
                const newMapId = useGameStore.getState().currentMapId;
                if (newMapId !== currentMapId) {
                    
                    // Notify all PK opponents
                    activeSessions.forEach(opponentId => {
                        socket.emit('pk_forfeit', {
                            opponentId,
                            reason: 'left_map'
                        });
                    });

                    // Clear all PK sessions
                    useGameStore.getState().activePKSessions.forEach(id => {
                        useGameStore.getState().removePKSession(id);
                    });

                    setNotification({
                        message: '❌ Bạn đã thua vì rời khỏi chiến trường!',
                        type: 'error'
                    });

                    // Teleport to spawn and heal
                    setTimeout(() => {
                        useGameStore.getState().setCurrentMapId('map1');
                        useGameStore.getState().setPlayerPosition(400, 300);
                        setPlayerStats({
                            currentHp: playerStats.maxHp,
                            mp: playerStats.maxMp
                        });
                    }, 1000);
                }
            };

            const interval = setInterval(checkMapChange, 500);
            return () => clearInterval(interval);
        }
    }, [socket, setNotification, setPlayerStats, playerStats.maxHp, playerStats.maxMp]);

    // Listen for PK requests
    useEffect(() => {
        if (!socket) return;

        socket.on('pk_request', (data: any) => {
            useGameStore.getState().addPKRequest(data);
        });

        socket.on('pk_request_response', (data: any) => {
            
            if (data.accepted) {
                const state = useGameStore.getState();
                
                // Enable PK mode and add session
                state.setIsPKMode(true);
                state.addPKSession(data.targetSocketId);
                
                // Hồi phục HP/Mana khi bắt đầu PK
                setPlayerStats({
                    currentHp: state.playerStats.maxHp,
                    mp: state.playerStats.maxMp
                });
                
                emitHPUpdate(state.playerStats.maxHp, state.playerStats.maxHp);
                
                state.setNotification({
                    message: data.message + ' 💚 HP đã hồi phục!',
                    type: 'success'
                });
            } else {
                useGameStore.getState().setNotification({
                    message: data.message,
                    type: 'info'
                });
            }
        });

        socket.on('pk_request_error', (data: any) => {
            useGameStore.getState().setNotification({
                message: data.message,
                type: 'error'
            });
        });

        return () => {
            socket.off('pk_request');
            socket.off('pk_request_response');
            socket.off('pk_request_error');
        };
    }, [socket]);

    // Listen for combat events
    useEffect(() => {
        if (!socket) return;

        // Skill used by someone
        socket.on('skill_used', (data: any) => {
            
            // Show skill animation (you can add visual effects here)
            if (data.casterId !== socket.id) {
                // Someone else used a skill
                const skill = SKILLS[data.skillId];
                if (skill) {
                    // Add visual effect at position
                }
            }
        });

        // Player took damage
        socket.on('player_damaged', (data: any) => {
            
            // Only process if we are the target
            if (data.playerId === socket.id) {
                // Check if we're blocking
                const state = useGameStore.getState();
                
                
                // Block miễn nhiễm hoàn toàn - không nhận damage
                if (state.isBlocking) {
                    setNotification({ message: '🛡️ Miễn nhiễm!', type: 'success' });
                    addDamageIndicator(playerPosition.x, playerPosition.y, 0);
                    return; // Không nhận damage
                }
                
                // Gọi API để take damage (server validate và update database)
                (async () => {
                    try {
                        console.log('🛡️ [VICTIM] Receiving damage:', {
                            skillId: data.skillId,
                            damageFromAttacker: data.damage,
                            attackerId: data.attackerId
                        });

                        const response = await sendObfuscatedRequest('/api/player/take-damage', {
                            userId: user?.id,
                            sessionId: user?.sessionId,
                            token: user?.socketToken,
                            attackerId: data.attackerId,
                            skillId: data.skillId,
                            attackerUserId: data.attackerUserId // Gửi userId của attacker để server tính damage
                        });

                        const result = await response.json();

                        if (result.success) {
                            // Update HP từ server
                            setPlayerStats({ currentHp: result.hp });
                            addDamageIndicator(playerPosition.x, playerPosition.y, result.damage);

                            // Broadcast our HP to others
                            emitHPUpdate(result.hp, playerStats.maxHp);

                            // Apply skill effects
                            const skill = SKILLS[data.skillId];
                            if (skill?.effect && skill.effectDuration && result.damage > 1) {
                                addActiveEffect({
                                    type: skill.effect,
                                    endTime: Date.now() + skill.effectDuration,
                                    value: result.damage
                                });
                            }


                            // Check death
                            if (result.isDead) {
                                const activeSessions = useGameStore.getState().activePKSessions;
                                const isPKDeath = activeSessions.includes(data.attackerId);
                                
                                socket.emit('player_death', { 
                                    killerId: data.attackerId,
                                    killerSocketId: data.attackerId,
                                    isPK: isPKDeath
                                });
                                
                                setNotification({ message: '💀 Bạn đã thua!', type: 'error' });
                                
                                // End PK session with killer
                                const state = useGameStore.getState();
                                if (state.activePKSessions.includes(data.attackerId)) {
                                    state.removePKSession(data.attackerId);
                                    
                                    // Notify opponent
                                    socket.emit('pk_ended', {
                                        opponentId: data.attackerId,
                                        winner: data.attackerId,
                                        reason: 'death'
                                    });
                                }
                                
                                // Disable PK mode if no more active sessions
                                if (state.activePKSessions.length === 0) {
                                    state.setIsPKMode(false);
                                }
                                
                                // Respawn: gọi API để set HP = 1 trong database
                                setTimeout(async () => {
                                    try {
                                        const respawnResponse = await sendObfuscatedRequest('/api/player/respawn', {
                                            userId: user?.id,
                                            sessionId: user?.sessionId,
                                            token: user?.socketToken
                                        });

                                        const respawnData = await respawnResponse.json();

                                        if (respawnData.success) {
                                            useGameStore.getState().setCurrentMapId('map1');
                                            useGameStore.getState().setPlayerPosition(400, 300);
                                            setPlayerStats({ 
                                                currentHp: respawnData.hp,
                                                mp: respawnData.mp 
                                            });
                                            emitHPUpdate(respawnData.hp, respawnData.maxHp);
                                            setNotification({ message: '🏥 Hồi sinh tại Làng Tân Thủ! (HP: 1)', type: 'info' });
                                        }
                                    } catch (error) {
                                        console.error('[Respawn] Failed:', error);
                                    }
                                }, 3000);
                            }
                        } else {
                            console.error('[Combat] Take damage API error:', result.error);
                        }
                    } catch (error) {
                        console.error('[Combat] Take damage API error:', error);
                    }
                })();
            } else {
                // Someone else took damage - show indicator
                const target = otherPlayers.get(data.playerId);
                if (target) {
                    addDamageIndicator(target.x, target.y, data.damage);
                }
            }
        });

        // Player died
        socket.on('player_died', async (data: any) => {
            
            if (data.killerId === socket.id) {
                // End PK session
                const state = useGameStore.getState();
                if (state.activePKSessions.includes(data.playerId)) {
                    state.removePKSession(data.playerId);
                }
                
                // Disable PK mode if no more active sessions
                if (state.activePKSessions.length === 0) {
                    state.setIsPKMode(false);
                }
                
                setNotification({ 
                    message: `🏆 Bạn đã chiến thắng ${data.playerUsername}!`, 
                    type: 'success' 
                });

                // Restore HP/MP về 100% (winner cũng được restore)
                if (user) {
                    try {
                        const response = await import('@/lib/requestObfuscator').then(m => 
                            m.sendObfuscatedRequest('/api/player/restore-hp', {
                                userId: user.id,
                                sessionId: user.sessionId,
                                token: user.socketToken
                            })
                        );

                        const restoreData = await response.json();
                        if (restoreData.success) {
                            setPlayerStats({
                                currentHp: restoreData.hp,
                                maxHp: restoreData.maxHp,
                                mp: restoreData.mp,
                                maxMp: restoreData.maxMp
                            });
                            console.log('[PK] Winner HP/MP restored to 100%:', restoreData.hp, '/', restoreData.maxHp);
                        }
                    } catch (error) {
                        console.error('[PK] Failed to restore winner HP:', error);
                    }
                }
            }
        });

        // PK Forfeit (opponent left map)
        socket.on('pk_forfeit', (data: any) => {
            
            // End PK session
            const state = useGameStore.getState();
            if (state.activePKSessions.includes(data.playerId)) {
                state.removePKSession(data.playerId);
            }
            
            // Disable PK mode if no more active sessions
            if (state.activePKSessions.length === 0) {
                state.setIsPKMode(false);
            }
            
            // Người thắng giữ nguyên HP/MP hiện tại
            setNotification({
                message: '🏆 Đối thủ đã bỏ chạy! Bạn thắng!',
                type: 'success'
            });
        });

        // PK Ended
        socket.on('pk_ended', async (data: any) => {
            
            const state = useGameStore.getState();
            if (state.activePKSessions.includes(data.opponentId)) {
                state.removePKSession(data.opponentId);
            }

            // Disable PK mode if no more active sessions
            if (state.activePKSessions.length === 0) {
                state.setIsPKMode(false);
            }

            // Show notification
            if (data.winner === socket.id) {
                setNotification({
                    message: '🏆 Chiến thắng!',
                    type: 'success'
                });
            } else {
                setNotification({
                    message: data.message || 'PK kết thúc',
                    type: 'info'
                });
            }

            // Restore HP/MP về 100% cho cả 2 bên
            if (user) {
                try {
                    const response = await import('@/lib/requestObfuscator').then(m => 
                        m.sendObfuscatedRequest('/api/player/restore-hp', {
                            userId: user.id,
                            sessionId: user.sessionId,
                            token: user.socketToken
                        })
                    );

                    const restoreData = await response.json();
                    if (restoreData.success) {
                        setPlayerStats({
                            currentHp: restoreData.hp,
                            maxHp: restoreData.maxHp,
                            mp: restoreData.mp,
                            maxMp: restoreData.maxMp
                        });
                        console.log('[PK] HP/MP restored to 100% after PK end:', restoreData.hp, '/', restoreData.maxHp);
                    }
                } catch (error) {
                    console.error('[PK] Failed to restore HP after PK end:', error);
                }
            }
        });

        // HP update from other players
        socket.on('player_hp_updated', (data: any) => {
            updateOtherPlayer(data.playerId, {
                hp: data.hp,
                maxHp: data.maxHp
            });
        });

        return () => {
            socket.off('skill_used');
            socket.off('player_damaged');
            socket.off('player_died');
            socket.off('player_hp_updated');
            socket.off('pk_forfeit');
            socket.off('pk_ended');
        };
    }, [socket, playerStats, playerPosition, otherPlayers, setPlayerStats, addDamageIndicator, addActiveEffect, setNotification, updateOtherPlayer]);

    // MP regeneration: +30 MP mỗi 10 giây và sync với database
    useEffect(() => {
        if (!user) return;

        const interval = setInterval(async () => {
            const state = useGameStore.getState();
            const mp = state.playerStats.mp;
            const maxMp = state.playerStats.maxMp;
            
            if (mp < maxMp) {
                const newMp = Math.min(maxMp, mp + 30);
                
                // Update local state ngay
                setPlayerStats({ mp: newMp });
                
                // Sync với database (batch update mỗi 10s)
                try {
                    const response = await sendObfuscatedRequest('/api/player/regen-mp', {
                        userId: user.id,
                        sessionId: user.sessionId,
                        token: user.socketToken,
                        mp: newMp
                    });

                    if (response.ok) {
                    }
                } catch (error) {
                    console.error('[MP Regen] Failed to sync:', error);
                }
            }
        }, 10000); // 10 giây

        return () => clearInterval(interval);
    }, [user, setPlayerStats]);

    return null; // This is a logic-only component
};

export default CombatManager;

