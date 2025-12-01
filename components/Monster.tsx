'use client';

import React, { useEffect, useRef } from 'react';
import { useGameStore } from '@/lib/store';

interface MonsterProps {
    monsterId: string;
    name: string;
    level: number;
    hp: number;
    maxHp: number;
    attack: number;
    x: number;
    y: number;
    sprite: string;
    aggroRange: number;
    attackRange: number;
    isDead: boolean;
    goldDrop?: number;
}

const Monster: React.FC<MonsterProps> = ({
    monsterId,
    name,
    level,
    hp,
    maxHp,
    x,
    y,
    sprite,
    aggroRange,
    isDead,
    goldDrop
}) => {
    const { socket, addDamageIndicator } = useGameStore();
    const lastAttackRef = useRef(0);

    // Auto-attack player when in range and enable PK mode
    useEffect(() => {
        if (isDead || !socket) return;

        const checkAggro = setInterval(() => {
            // Get fresh player position from store (not from props/dependencies)
            const state = useGameStore.getState();
            const currentPlayerPos = state.playerPosition;
            
            const distance = Math.sqrt(
                Math.pow(currentPlayerPos.x - x, 2) + 
                Math.pow(currentPlayerPos.y - y, 2)
            );

            // Enable PK mode when player enters aggro range
            if (distance < aggroRange) {
                if (!state.isPKMode) {
                    state.setIsPKMode(true);
                }

                // Monster attacks
                const now = Date.now();
                if (now - lastAttackRef.current > 3000) { // Attack every 3s
                    lastAttackRef.current = now;
                    
                    socket.emit('monster_attack', {
                        monsterId,
                        targetSocketId: socket.id
                    });
                }
            }
        }, 1000); // Check every 1s

        return () => clearInterval(checkAggro);
    }, [isDead, socket, x, y, aggroRange, monsterId]);

    const handleClick = () => {
        if (isDead && goldDrop) {
            // Request to pick up gold (server will validate)
            if (socket) {
                socket.emit('pickup_gold', { monsterId });
            }
        } else if (!isDead) {
            // Target monster for attack - enable PK mode
            const state = useGameStore.getState();
            state.setIsPKMode(true);
            state.setNotification({
                message: `⚔️ Đã chọn ${name} làm mục tiêu!`,
                type: 'info'
            });
        }
    };

    if (isDead && !goldDrop) return null; // Completely dead, no loot

    return (
        <div
            onClick={handleClick}
            style={{
                position: 'absolute',
                left: x,
                top: y,
                width: '64px',
                height: '64px',
                transform: 'translate(-50%, -50%)',
                zIndex: Math.floor(y) + 1000,
                cursor: isDead ? 'pointer' : 'crosshair',
                pointerEvents: 'auto',
            }}
        >
            {!isDead ? (
                <>
                    {/* Monster Sprite */}
                    <div
                        style={{
                            width: '100%',
                            height: '100%',
                            backgroundImage: `url(${sprite})`,
                            backgroundSize: 'contain',
                            backgroundRepeat: 'no-repeat',
                        }}
                    />

                    {/* Monster Name & Level */}
                    <div style={{
                        position: 'absolute',
                        top: '-35px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        color: '#ff6b6b',
                        textShadow: '1px 1px 2px black, -1px -1px 2px black',
                        fontSize: '11px',
                        whiteSpace: 'nowrap',
                        fontWeight: 'bold',
                        pointerEvents: 'none'
                    }}>
                        Lv.{level} {name}
                    </div>

                    {/* HP Bar */}
                    <div style={{
                        position: 'absolute',
                        top: '-22px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '60px',
                        height: '6px',
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        borderRadius: '3px',
                        overflow: 'hidden',
                        border: '1px solid rgba(255,255,255,0.3)',
                    }}>
                        <div style={{
                            width: `${(hp / maxHp) * 100}%`,
                            height: '100%',
                            backgroundColor: hp > maxHp * 0.5 ? '#4CAF50' : hp > maxHp * 0.25 ? '#ff9800' : '#f44336',
                            transition: 'width 0.3s',
                        }} />
                    </div>
                </>
            ) : (
                // Gold drop
                <div style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '32px',
                    animation: 'bounce 1s infinite',
                }}>
                    💰
                    <style jsx>{`
                        @keyframes bounce {
                            0%, 100% { transform: translateY(0); }
                            50% { transform: translateY(-10px); }
                        }
                    `}</style>
                </div>
            )}
        </div>
    );
};

export default Monster;
