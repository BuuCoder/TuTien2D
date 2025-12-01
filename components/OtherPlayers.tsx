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

    const sendPKRequest = (playerId: string, playerUserId: number, playerUsername: string) => {
        if (!socket || !user) return;

        const requestId = `${user.id}-${playerUserId}-${Date.now()}`;

        socket.emit('send_pk_request', {
            requestId,
            toSocketId: playerId,
            toUserId: playerUserId,
            toUsername: playerUsername
        });

        useGameStore.getState().setNotification({
            message: `Đã gửi lời mời PK đến ${playerUsername}`,
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
                            zIndex: Math.floor(player.y), // Z-index based on Y position
                            opacity: 0.8
                        }}
                    >
                        {/* Player name */}
                        <div style={{
                            position: 'absolute',
                            top: '-35px',
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

                        {/* HP Bar */}
                        {player.hp !== undefined && player.maxHp && (
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
                                    width: `${(player.hp / player.maxHp) * 100}%`,
                                    height: '100%',
                                    backgroundColor: player.hp > player.maxHp * 0.5 ? '#2ecc71' : player.hp > player.maxHp * 0.25 ? '#f39c12' : '#e74c3c',
                                    transition: 'width 0.3s',
                                }} />
                            </div>
                        )}

                        {isNearby && (
                            <div style={{
                                position: 'absolute',
                                top: '70px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                display: 'flex',
                                gap: '5px',
                                zIndex: 1001
                            }}>
                                <button
                                    onClick={() => sendFriendRequest(
                                        player.id,
                                        (player as any).userId,
                                        player.username || 'Người chơi khác'
                                    )}
                                    style={{
                                        padding: '4px 8px',
                                        backgroundColor: '#667eea',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        fontSize: '11px',
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                                    }}
                                >
                                    🤝
                                </button>
                                <button
                                    onClick={() => sendPKRequest(
                                        player.id,
                                        (player as any).userId,
                                        player.username || 'Người chơi khác'
                                    )}
                                    style={{
                                        padding: '4px 8px',
                                        backgroundColor: '#e74c3c',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        fontSize: '11px',
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                                    }}
                                >
                                    ⚔️
                                </button>
                            </div>
                        )}
                    </div>
                );
            })}
        </>
    );
};

export default OtherPlayers;
