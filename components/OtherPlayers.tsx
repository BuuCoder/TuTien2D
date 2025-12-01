'use client';

import React from 'react';
import { useGameStore } from '@/lib/store';

const NEARBY_DISTANCE = 100; // pixels

const OtherPlayers = () => {
    const { currentMapId, otherPlayers, playerPosition, socket, user } = useGameStore();

    const sendFriendRequest = (playerId: string, playerUserId: number, playerUsername: string) => {
        if (!socket || !user) return;

        socket.emit('send_friend_request', {
            toUserId: playerUserId,
            toUsername: playerUsername
        });

        useGameStore.getState().setNotification({
            message: `Đã gửi lời mời kết bạn đến ${playerUsername}`,
            type: 'info'
        });
    };

    const calculateDistance = (x1: number, y1: number, x2: number, y2: number) => {
        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    };

    return (
        <>
            {Array.from(otherPlayers.values())
                .filter((player) => player.mapId === currentMapId) // Chỉ hiển thị người chơi cùng map
                .map((player) => {
                const gifPath = player.action === 'idle'
                    ? `/assets/knight/idle/down_idle.gif`
                    : `/assets/knight/${player.action}/${player.direction}_${player.action}.gif`;

                const finalGifPath = player.direction ? gifPath : `/assets/knight/idle/down_idle.gif`;

                // Check if player is nearby
                const distance = calculateDistance(
                    playerPosition.x,
                    playerPosition.y,
                    player.x,
                    player.y
                );
                const isNearby = distance < NEARBY_DISTANCE;

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
                            {player.username || 'Người chơi khác'}
                        </div>

                        {isNearby && (
                            <button
                                onClick={() => sendFriendRequest(
                                    player.id,
                                    (player as any).userId,
                                    player.username || 'Người chơi khác'
                                )}
                                style={{
                                    position: 'absolute',
                                    top: '70px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    padding: '4px 8px',
                                    backgroundColor: '#667eea',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    fontSize: '11px',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                                    zIndex: 1001
                                }}
                            >
                                🤝 Kết bạn
                            </button>
                        )}
                    </div>
                );
            })}
        </>
    );
};

export default OtherPlayers;
