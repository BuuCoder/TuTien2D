'use client';

import React, { useEffect } from 'react';
import { useGameStore } from '@/lib/store';
import { SKILLS } from '@/lib/skillData';

const CombatUI = () => {
    const { 
        playerStats, 
        skillCooldowns, 
        isPKMode, 
        setIsPKMode,
        activeEffects,
        removeExpiredEffects,
        activePKSessions 
    } = useGameStore();

    const [isMobile, setIsMobile] = React.useState(false);

    React.useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Clean up expired effects
    useEffect(() => {
        const interval = setInterval(() => {
            removeExpiredEffects();
        }, 100);
        return () => clearInterval(interval);
    }, [removeExpiredEffects]);

    const handleSkillClick = (skillId: string) => {
        const skill = SKILLS[skillId];
        if (!skill) {
            console.log('[CombatUI] Skill not found:', skillId);
            return;
        }

        console.log('[CombatUI] Attempting to use skill:', skillId);
        console.log('[CombatUI] isPKMode:', isPKMode);
        console.log('[CombatUI] activePKSessions:', activePKSessions);

        // Check cooldown
        const cooldown = skillCooldowns.find(cd => cd.skillId === skillId);
        if (cooldown && cooldown.endTime > Date.now()) {
            console.log('[CombatUI] Skill on cooldown');
            return;
        }

        // Check mana
        if (playerStats.currentMana < skill.manaCost) {
            console.log('[CombatUI] Not enough mana');
            useGameStore.getState().setNotification({
                message: 'Không đủ mana!',
                type: 'error'
            });
            return;
        }

        // Check if in PK mode and has active sessions
        if (!isPKMode) {
            console.log('[CombatUI] Not in PK mode');
            useGameStore.getState().setNotification({
                message: 'Bật PK Mode để sử dụng skill!',
                type: 'error'
            });
            return;
        }

        if (activePKSessions.length === 0 && skillId !== 'heal') {
            console.log('[CombatUI] No active PK sessions');
            useGameStore.getState().setNotification({
                message: 'Không có đối thủ PK!',
                type: 'error'
            });
            return;
        }

        // Trigger skill use via CombatManager
        console.log('[CombatUI] Triggering skill use');
        const event = new CustomEvent('useSkill', { detail: { skillId } });
        window.dispatchEvent(event);
    };

    const getSkillCooldownPercent = (skillId: string) => {
        const cooldown = skillCooldowns.find(cd => cd.skillId === skillId);
        if (!cooldown) return 0;
        
        const skill = SKILLS[skillId];
        const remaining = cooldown.endTime - Date.now();
        return Math.max(0, (remaining / skill.cooldown) * 100);
    };

    const skillList = ['basic-attack', 'slash', 'charge', 'fireball', 'ice-spike', 'heal', 'holy-strike', 'block'];

    return (
        <>
            {/* HP and Mana Bars - Top */}
            <div style={{
                position: 'fixed',
                top: '10px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 1000,
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                backgroundColor: 'rgba(0,0,0,0.7)',
                padding: isMobile ? '6px 10px' : '8px 12px',
                borderRadius: '8px',
            }}>
                {/* HP Bar */}
                <div>
                    <div style={{ fontSize: '9px', color: 'white', marginBottom: '2px' }}>
                        HP: {playerStats.currentHp}/{playerStats.maxHp}
                    </div>
                    <div style={{
                        width: isMobile ? '180px' : '250px',
                        height: '12px',
                        backgroundColor: 'rgba(255,0,0,0.3)',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        border: '1px solid rgba(255,255,255,0.3)',
                    }}>
                        <div style={{
                            width: `${(playerStats.currentHp / playerStats.maxHp) * 100}%`,
                            height: '100%',
                            backgroundColor: '#e74c3c',
                            transition: 'width 0.3s',
                        }} />
                    </div>
                </div>

                {/* Mana Bar */}
                <div>
                    <div style={{ fontSize: '9px', color: 'white', marginBottom: '2px' }}>
                        Mana: {playerStats.currentMana}/{playerStats.maxMana}
                    </div>
                    <div style={{
                        width: isMobile ? '180px' : '250px',
                        height: '10px',
                        backgroundColor: 'rgba(0,0,255,0.3)',
                        borderRadius: '5px',
                        overflow: 'hidden',
                        border: '1px solid rgba(255,255,255,0.3)',
                    }}>
                        <div style={{
                            width: `${(playerStats.currentMana / playerStats.maxMana) * 100}%`,
                            height: '100%',
                            backgroundColor: '#3498db',
                            transition: 'width 0.3s',
                        }} />
                    </div>
                </div>

                {/* Active Effects */}
                {activeEffects.length > 0 && (
                    <div style={{ display: 'flex', gap: '4px', marginTop: '4px', justifyContent: 'center' }}>
                        {activeEffects.map((effect, i) => (
                            <div key={i} style={{
                                padding: '2px 6px',
                                backgroundColor: 'rgba(255,255,255,0.2)',
                                borderRadius: '3px',
                                fontSize: '8px',
                                color: 'white',
                            }}>
                                {effect.type === 'stun' && '😵'}
                                {effect.type === 'slow' && '🐌'}
                                {effect.type === 'burn' && '🔥'}
                                {effect.type === 'heal' && '💚'}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Skill Bar - Bottom (only show when in active PK) */}
            {activePKSessions.length > 0 && (
                <div style={{
                    position: 'fixed',
                    bottom: '10px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 1000,
                    display: 'flex',
                    gap: isMobile ? '5px' : '6px',
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    padding: isMobile ? '6px' : '8px',
                    borderRadius: '8px',
                }}>
                    {skillList.map((skillId, index) => {
                        const skill = SKILLS[skillId];
                        const cooldownPercent = getSkillCooldownPercent(skillId);
                        const canUse = playerStats.currentMana >= skill.manaCost && cooldownPercent === 0;

                        return (
                            <div
                                key={skillId}
                                onClick={() => handleSkillClick(skillId)}
                                style={{
                                    position: 'relative',
                                    width: isMobile ? '35px' : '45px',
                                    height: isMobile ? '35px' : '45px',
                                    backgroundColor: canUse ? 'rgba(76,175,80,0.8)' : 'rgba(100,100,100,0.8)',
                                    borderRadius: '6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: canUse ? 'pointer' : 'not-allowed',
                                    border: '1px solid rgba(255,255,255,0.3)',
                                    fontSize: isMobile ? '16px' : '20px',
                                    transition: 'all 0.2s',
                                }}
                                title={`${skill.name} (${skill.manaCost} mana)\n${skill.description}\nHotkey: ${index + 1}`}
                            >
                                {skill.icon}
                                
                                {/* Cooldown overlay */}
                                {cooldownPercent > 0 && (
                                    <div style={{
                                        position: 'absolute',
                                        bottom: 0,
                                        left: 0,
                                        right: 0,
                                        height: `${cooldownPercent}%`,
                                        backgroundColor: 'rgba(0,0,0,0.7)',
                                        borderRadius: '0 0 5px 5px',
                                    }} />
                                )}

                                {/* Hotkey number */}
                                <div style={{
                                    position: 'absolute',
                                    top: '1px',
                                    right: '3px',
                                    fontSize: '8px',
                                    color: 'white',
                                    fontWeight: 'bold',
                                }}>
                                    {index + 1}
                                </div>

                                {/* Mana cost */}
                                <div style={{
                                    position: 'absolute',
                                    bottom: '1px',
                                    right: '3px',
                                    fontSize: '7px',
                                    color: '#3498db',
                                    fontWeight: 'bold',
                                }}>
                                    {skill.manaCost}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </>
    );
};

export default CombatUI;
