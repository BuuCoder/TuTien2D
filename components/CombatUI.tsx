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
        if (!skill) return;

        // Check cooldown
        const cooldown = skillCooldowns.find(cd => cd.skillId === skillId);
        if (cooldown && cooldown.endTime > Date.now()) {
            return;
        }

        // Check mana
        if (playerStats.mp < skill.manaCost) {
            useGameStore.getState().setNotification({
                message: 'Không đủ MP!',
                type: 'error'
            });
            return;
        }

        // Skill hồi phục và block không cần PK mode
        const isHealSkill = skillId === 'heal';
        const isBlockSkill = skillId === 'block';

        // Check if in PK mode (chỉ cho skill tấn công)
        if (!isPKMode && !isHealSkill && !isBlockSkill) {
            useGameStore.getState().setNotification({
                message: 'Bật PK Mode hoặc tìm quái để sử dụng skill tấn công!',
                type: 'error'
            });
            return;
        }

        // Trigger skill use via CombatManager (it will find target automatically)
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
            {/* Active Effects - Top Center */}
            {activeEffects.length > 0 && (
                <div style={{
                    position: 'fixed',
                    top: '10px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 1000,
                    display: 'flex',
                    gap: '6px',
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    padding: '6px 12px',
                    borderRadius: '8px',
                }}>
                    {activeEffects.map((effect, i) => (
                        <div key={i} style={{
                            padding: '4px 8px',
                            backgroundColor: 'rgba(255,255,255,0.2)',
                            borderRadius: '6px',
                            fontSize: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                        }}>
                            {effect.type === 'stun' && '😵'}
                            {effect.type === 'slow' && '🐌'}
                            {effect.type === 'burn' && '🔥'}
                            {effect.type === 'heal' && '💚'}
                        </div>
                    ))}
                </div>
            )}

            {/* Skill Bar - Bottom (always visible) */}
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
                    const canUse = playerStats.mp >= skill.manaCost && cooldownPercent === 0;

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
        </>
    );
};

export default CombatUI;
