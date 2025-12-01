'use client';

import React from 'react';
import { useGameStore } from '@/lib/store';

const OtherPlayers = () => {
    const { otherPlayers } = useGameStore();

    return (
        <>
            {Array.from(otherPlayers.values()).map((player) => {
                const gifPath = player.action === 'idle'
                    ? `/assets/knight/idle/down_idle.gif`
                    : `/assets/knight/${player.action}/${player.direction}_${player.action}.gif`;

                // Fallback if direction is missing
                const finalGifPath = player.direction ? gifPath : `/assets/knight/idle/down_idle.gif`;

                return (
                    <div
                        key={player.id}
                        style={{
                            position: 'absolute',
                            left: player.x,
                            top: player.y,
                            width: '64px',
                            height: '64px',
                            backgroundImage: `url(${finalGifPath})`,
                            backgroundSize: 'contain',
                            backgroundRepeat: 'no-repeat',
                            transform: 'translate(-50%, -50%)',
                            zIndex: 999,
                            opacity: 0.8
                        }}
                    >
                        <div style={{
                            position: 'absolute',
                            top: '-20px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            color: '#aaa',
                            textShadow: '1px 1px 2px black',
                            fontSize: '12px',
                            whiteSpace: 'nowrap',
                            fontWeight: 'bold',
                            pointerEvents: 'none'
                        }}>
                            Người chơi khác
                        </div>
                    </div>
                );
            })}
        </>
    );
};

export default OtherPlayers;
