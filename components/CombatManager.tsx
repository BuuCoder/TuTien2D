'use client';

import React, { useEffect, useCallback } from 'react';
import { useGameStore } from '@/lib/store';
import { SKILLS } from '@/lib/skillData';

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
            console.log('[CombatManager] Received useSkill event:', skillId);
            useSkill(skillId);
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('useSkill', handleUseSkillEvent as EventListener);
        
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('useSkill', handleUseSkillEvent as EventListener);
        };
    }, [isPKMode, playerStats, socket, playerPosition, otherPlayers]);

    const useSkill = useCallback((skillId: string) => {
        console.log('[CombatManager] useSkill called:', skillId);
        
        const skill = SKILLS[skillId];
        if (!skill) {
            console.log('[CombatManager] Skill not found');
            return;
        }
        
        if (!socket) {
            console.log('[CombatManager] No socket connection');
            return;
        }
        
        if (!isPKMode) {
            console.log('[CombatManager] Not in PK mode');
            return;
        }

        // Check cooldown
        const cooldowns = useGameStore.getState().skillCooldowns;
        const cooldown = cooldowns.find(cd => cd.skillId === skillId);
        if (cooldown && cooldown.endTime > Date.now()) {
            return;
        }

        // Check mana
        if (playerStats.currentMana < skill.manaCost) {
            setNotification({ message: 'Không đủ mana!', type: 'error' });
            return;
        }

        // Check if stunned
        const effects = useGameStore.getState().activeEffects;
        if (effects.some(e => e.type === 'stun')) {
            setNotification({ message: 'Bạn đang bị choáng!', type: 'error' });
            return;
        }

        // Find nearest target (only from active PK sessions)
        const activeSessions = useGameStore.getState().activePKSessions;
        console.log('[CombatManager] Active PK sessions:', activeSessions);
        console.log('[CombatManager] Other players:', Array.from(otherPlayers.keys()));
        
        let targetId = null;
        let minDistance = skill.range;

        otherPlayers.forEach((player, id) => {
            console.log('[CombatManager] Checking player:', id, 'in sessions:', activeSessions.includes(id));
            
            // Only target players we're in PK session with
            if (!activeSessions.includes(id)) return;

            const distance = Math.sqrt(
                Math.pow(player.x - playerPosition.x, 2) + 
                Math.pow(player.y - playerPosition.y, 2)
            );
            
            console.log('[CombatManager] Distance to', id, ':', distance, 'range:', skill.range);
            
            if (distance < minDistance) {
                minDistance = distance;
                targetId = id;
            }
        });

        console.log('[CombatManager] Selected target:', targetId);

        // Self-heal doesn't need target
        if (skillId === 'heal') {
            targetId = null;
        } else if (!targetId && skillId !== 'heal') {
            console.log('[CombatManager] No target in range');
            setNotification({ message: 'Không có mục tiêu trong tầm!', type: 'error' });
            return;
        }

        // Consume mana
        setPlayerStats({ 
            currentMana: Math.max(0, playerStats.currentMana - skill.manaCost) 
        });

        // Add cooldown
        addSkillCooldown(skillId, skill.cooldown);

        // Emit skill use
        console.log('[CombatManager] Emitting use_skill:', { skillId, targetId, position: playerPosition });
        socket.emit('use_skill', {
            skillId,
            targetId,
            position: playerPosition
        });

        // Apply self-effects
        if (skillId === 'heal') {
            const healAmount = Math.abs(skill.damage);
            const newHp = Math.min(playerStats.maxHp, playerStats.currentHp + healAmount);
            setPlayerStats({ currentHp: newHp });
            addDamageIndicator(playerPosition.x, playerPosition.y, -healAmount);
            addActiveEffect({ type: 'heal', endTime: Date.now() + 1000 });
        } else if (skillId === 'block') {
            // Activate block for 100ms window
            useGameStore.getState().setIsBlocking(true);
            useGameStore.getState().setBlockEndTime(Date.now() + 100);
            
            setTimeout(() => {
                useGameStore.getState().setIsBlocking(false);
            }, 100);
            
            setNotification({ message: '🛡️ Phòng thủ!', type: 'info' });
            console.log('[CombatManager] Block activated');
        }

        // Calculate and apply damage to target
        if (targetId) {
            const target = otherPlayers.get(targetId);
            if (target) {
                const finalDamage = skill.damage;
                
                console.log('[CombatManager] Dealing damage:', finalDamage, 'to', targetId, 'from', socket.id);
                console.log('[CombatManager] Emitting take_damage with:', {
                    damage: finalDamage,
                    attackerId: socket.id,
                    targetId: targetId,
                    skillId
                });
                
                // Emit damage
                socket.emit('take_damage', {
                    damage: finalDamage,
                    attackerId: socket.id,
                    targetId: targetId,
                    skillId
                });
            }
        }

        console.log(`[Combat] Used skill ${skillId} on ${targetId || 'self'}`);
    }, [socket, isPKMode, playerStats, playerPosition, otherPlayers, setPlayerStats, addSkillCooldown, addDamageIndicator, setNotification, addActiveEffect]);

    // Broadcast initial HP when joining
    useEffect(() => {
        if (!socket || !user) return;

        const timer = setTimeout(() => {
            socket.emit('update_hp', {
                hp: playerStats.currentHp,
                maxHp: playerStats.maxHp
            });
            console.log('[Combat] Broadcasted initial HP');
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
            console.log('[Combat] In PK session, checking map change');
            
            const checkMapChange = () => {
                const newMapId = useGameStore.getState().currentMapId;
                if (newMapId !== currentMapId) {
                    console.log('[Combat] Map changed during PK! Forfeiting...');
                    
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
                            currentMana: playerStats.maxMana
                        });
                    }, 1000);
                }
            };

            const interval = setInterval(checkMapChange, 500);
            return () => clearInterval(interval);
        }
    }, [socket, setNotification, setPlayerStats, playerStats.maxHp, playerStats.maxMana]);

    // Listen for PK requests
    useEffect(() => {
        if (!socket) return;

        socket.on('pk_request', (data: any) => {
            console.log('[PK] Received PK request:', data);
            useGameStore.getState().addPKRequest(data);
        });

        socket.on('pk_request_response', (data: any) => {
            console.log('[PK] PK request response:', data);
            
            if (data.accepted) {
                useGameStore.getState().addPKSession(data.targetSocketId);
                
                // Hồi phục HP/Mana khi bắt đầu PK
                const state = useGameStore.getState();
                setPlayerStats({
                    currentHp: state.playerStats.maxHp,
                    currentMana: state.playerStats.maxMana
                });
                
                socket.emit('update_hp', {
                    hp: state.playerStats.maxHp,
                    maxHp: state.playerStats.maxHp
                });
                
                useGameStore.getState().setNotification({
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
            console.log('[Combat] Skill used:', data);
            
            // Show skill animation (you can add visual effects here)
            if (data.casterId !== socket.id) {
                // Someone else used a skill
                const skill = SKILLS[data.skillId];
                if (skill) {
                    // Add visual effect at position
                    console.log(`${data.casterUsername} used ${skill.name}`);
                }
            }
        });

        // Player took damage
        socket.on('player_damaged', (data: any) => {
            console.log('[Combat] ===== PLAYER DAMAGED EVENT =====');
            console.log('[Combat] Event data:', data);
            console.log('[Combat] My socket ID:', socket.id);
            console.log('[Combat] Am I the target?', data.playerId === socket.id);
            console.log('[Combat] Am I the attacker?', data.attackerId === socket.id);
            
            // Only process if we are the target
            if (data.playerId === socket.id) {
                console.log('[Combat] ✓ I am the target, processing damage');
                // Check if we're blocking
                const state = useGameStore.getState();
                
                console.log('[Combat] Blocking:', state.isBlocking, 'Damage:', data.damage);
                
                let actualDamage = data.damage;
                
                // Perfect block (within 100ms window)
                if (state.isBlocking) {
                    actualDamage = 1; // Minimal damage
                    setNotification({ message: '🛡️ Chặn hoàn hảo!', type: 'success' });
                    console.log('[Combat] Perfect block!');
                }
                
                // We took damage
                const newHp = Math.max(0, playerStats.currentHp - actualDamage);
                setPlayerStats({ currentHp: newHp });
                addDamageIndicator(playerPosition.x, playerPosition.y, actualDamage);

                // Broadcast our HP to others
                socket.emit('update_hp', {
                    hp: newHp,
                    maxHp: playerStats.maxHp
                });

                // Apply skill effects
                const skill = SKILLS[data.skillId];
                if (skill?.effect && skill.effectDuration && actualDamage > 1) {
                    addActiveEffect({
                        type: skill.effect,
                        endTime: Date.now() + skill.effectDuration,
                        value: actualDamage
                    });
                }

                // Check death
                if (newHp <= 0) {
                    socket.emit('player_death', { 
                        killerId: data.attackerId,
                        killerSocketId: data.attackerId 
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
                    
                    // Teleport to spawn and heal after 3 seconds
                    setTimeout(() => {
                        const maxHp = useGameStore.getState().playerStats.maxHp;
                        const maxMana = useGameStore.getState().playerStats.maxMana;
                        
                        useGameStore.getState().setCurrentMapId('map1');
                        useGameStore.getState().setPlayerPosition(400, 300);
                        setPlayerStats({ 
                            currentHp: maxHp,
                            currentMana: maxMana 
                        });
                        socket.emit('update_hp', { hp: maxHp, maxHp });
                        setNotification({ message: '🏥 Hồi sinh tại Làng Tân Thủ!', type: 'info' });
                    }, 3000);
                }
            } else {
                // Someone else took damage - show indicator
                const target = otherPlayers.get(data.playerId);
                if (target) {
                    addDamageIndicator(target.x, target.y, data.damage);
                }
            }
        });

        // Player died
        socket.on('player_died', (data: any) => {
            console.log('[Combat] Player died:', data);
            
            if (data.killerId === socket.id) {
                // End PK session
                const state = useGameStore.getState();
                if (state.activePKSessions.includes(data.playerId)) {
                    state.removePKSession(data.playerId);
                }
                
                // Hồi phục HP/Mana sau khi thắng
                setPlayerStats({
                    currentHp: state.playerStats.maxHp,
                    currentMana: state.playerStats.maxMana
                });
                
                socket.emit('update_hp', {
                    hp: state.playerStats.maxHp,
                    maxHp: state.playerStats.maxHp
                });
                
                setNotification({ 
                    message: `🏆 Bạn đã chiến thắng ${data.playerUsername}! 💚 HP đã hồi phục!`, 
                    type: 'success' 
                });
            }
        });

        // PK Forfeit (opponent left map)
        socket.on('pk_forfeit', (data: any) => {
            console.log('[Combat] Opponent forfeited:', data);
            
            // End PK session
            const state = useGameStore.getState();
            if (state.activePKSessions.includes(data.playerId)) {
                state.removePKSession(data.playerId);
            }
            
            // Hồi phục HP/Mana sau khi thắng
            setPlayerStats({
                currentHp: state.playerStats.maxHp,
                currentMana: state.playerStats.maxMana
            });
            
            socket.emit('update_hp', {
                hp: state.playerStats.maxHp,
                maxHp: state.playerStats.maxHp
            });
            
            setNotification({
                message: '🏆 Đối thủ đã bỏ chạy! Bạn thắng! 💚 HP đã hồi phục!',
                type: 'success'
            });
        });

        // PK Ended
        socket.on('pk_ended', (data: any) => {
            console.log('[Combat] PK ended:', data);
            
            const state = useGameStore.getState();
            if (state.activePKSessions.includes(data.opponentId)) {
                state.removePKSession(data.opponentId);
            }

            // Hồi phục HP/Mana khi kết thúc PK
            setPlayerStats({
                currentHp: state.playerStats.maxHp,
                currentMana: state.playerStats.maxMana
            });
            
            socket.emit('update_hp', {
                hp: state.playerStats.maxHp,
                maxHp: state.playerStats.maxHp
            });

            if (data.winner === socket.id) {
                setNotification({
                    message: '🏆 Chiến thắng! 💚 HP đã hồi phục!',
                    type: 'success'
                });
            } else {
                setNotification({
                    message: '💚 HP đã hồi phục!',
                    type: 'info'
                });
            }
        });

        // HP update from other players
        socket.on('player_hp_updated', (data: any) => {
            console.log('[Combat] Player HP updated:', data);
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

    // Mana regeneration
    useEffect(() => {
        const interval = setInterval(() => {
            const currentMana = useGameStore.getState().playerStats.currentMana;
            const maxMana = useGameStore.getState().playerStats.maxMana;
            
            if (currentMana < maxMana) {
                setPlayerStats({ 
                    currentMana: Math.min(maxMana, currentMana + 2) 
                });
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [setPlayerStats]);

    return null; // This is a logic-only component
};

export default CombatManager;
