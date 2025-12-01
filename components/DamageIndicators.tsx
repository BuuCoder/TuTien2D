'use client';

import React from 'react';
import { useGameStore } from '@/lib/store';

const DamageIndicators = () => {
    const { damageIndicators } = useGameStore();

    return (
        <>
            {damageIndicators.map((indicator) => {
                const isHealing = indicator.damage < 0;
                const displayDamage = Math.abs(indicator.damage);
                
                return (
                    <div
                        key={indicator.id}
                        style={{
                            position: 'absolute',
                            left: indicator.x,
                            top: indicator.y - 50,
                            transform: 'translateX(-50%)',
                            color: isHealing ? '#2ecc71' : '#e74c3c',
                            fontSize: '24px',
                            fontWeight: 'bold',
                            textShadow: '2px 2px 4px black, -2px -2px 4px black',
                            zIndex: 10001,
                            animation: 'damageFloat 1s ease-out',
                            pointerEvents: 'none',
                        }}
                    >
                        {isHealing ? `+${displayDamage}` : `-${displayDamage}`}
                        <style jsx>{`
                            @keyframes damageFloat {
                                0% {
                                    opacity: 1;
                                    transform: translateX(-50%) translateY(0);
                                }
                                100% {
                                    opacity: 0;
                                    transform: translateX(-50%) translateY(-50px);
                                }
                            }
                        `}</style>
                    </div>
                );
            })}
        </>
    );
};

export default DamageIndicators;
