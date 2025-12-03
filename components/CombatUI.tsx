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
                    top: '12px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 1000,
                    display: 'flex',
                    gap: '6px',
                    backgroundColor: 'rgba(17, 17, 17, 0.95)',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
                }}>
                    {activeEffects.map((effect, i) => (
                        <div key={i} style={{
                            padding: '6px 10px',
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            borderRadius: '6px',
                            fontSize: '18px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
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
                bottom: '12px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 1000,
                display: 'flex',
                gap: isMobile ? '6px' : '8px',
                backgroundColor: 'rgba(17, 17, 17, 0.95)',
                padding: isMobile ? '8px' : '10px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
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
                                width: isMobile ? '40px' : '48px',
                                height: isMobile ? '40px' : '48px',
                                background: canUse 
                                    ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.9) 0%, rgba(5, 150, 105, 0.9) 100%)' 
                                    : 'rgba(55, 65, 81, 0.8)',
                                borderRadius: '6px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: canUse ? 'pointer' : 'not-allowed',
                                border: canUse 
                                    ? '1px solid rgba(16, 185, 129, 0.3)' 
                                    : '1px solid rgba(255, 255, 255, 0.08)',
                                fontSize: isMobile ? '18px' : '22px',
                                transition: 'all 0.1s ease',
                                boxShadow: canUse 
                                    ? '0 2px 8px rgba(16, 185, 129, 0.3)' 
                                    : 'none',
                                transform: 'translateY(0)',
                            }}
                            title={`${skill.name} (${skill.manaCost} mana)\n${skill.description}\nHotkey: ${index + 1}`}
                            onMouseEnter={(e) => {
                                if (canUse && !isMobile) {
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.4)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (canUse && !isMobile) {
                                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(16, 185, 129, 0.3)';
                                }
                            }}
                            onMouseDown={(e) => {
                                if (canUse) {
                                    e.currentTarget.style.transform = 'scale(0.95)';
                                }
                            }}
                            onMouseUp={(e) => {
                                if (canUse) {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                }
                            }}
                            onTouchStart={(e) => {
                                if (canUse) {
                                    e.currentTarget.style.transform = 'scale(0.95)';
                                }
                            }}
                            onTouchEnd={(e) => {
                                if (canUse) {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                }
                            }}
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
                                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                    borderRadius: '0 0 5px 5px',
                                }} />
                            )}

                            {/* Hotkey number */}
                            <div style={{
                                position: 'absolute',
                                top: '2px',
                                right: '4px',
                                fontSize: '9px',
                                color: 'white',
                                fontWeight: '600',
                                textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)',
                                letterSpacing: '-0.02em'
                            }}>
                                {index + 1}
                            </div>

                            {/* Mana cost */}
                            <div style={{
                                position: 'absolute',
                                bottom: '2px',
                                right: '4px',
                                fontSize: '8px',
                                color: '#60a5fa',
                                fontWeight: '600',
                                textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)',
                                letterSpacing: '-0.02em'
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
