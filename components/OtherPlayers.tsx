'use client';

import React, { memo } from 'react';
import { useGameStore } from '@/lib/store';
import { getSkinById } from '@/lib/skinData';

const NEARBY_DISTANCE = 100; // pixels

interface OtherPlayerProps {
    player: any;
    playerPosition: { x: number; y: number };
    socket: any;
    user: any;
    activePKSessions: string[];
}

const OtherPlayerComponent = memo(({ player, playerPosition, socket, user, activePKSessions }: OtherPlayerProps) => {
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

    // Get player's skin, default to 'knight'
    const playerSkin = (player as any).skin || 'knight';

    // Get skin data for display size
    const skinData = getSkinById(playerSkin);
    const displaySize = skinData?.displaySize || 64; // Mặc định 64px

    // Force GIF reload when action changes by adding timestamp
    const gifPath = player.action === 'idle'
        ? `/assets/${playerSkin}/idle/down_idle.gif`
        : `/assets/${playerSkin}/${player.action}/${player.direction}_${player.action}.gif`;

    const finalGifPath = player.direction ? gifPath : `/assets/${playerSkin}/idle/down_idle.gif`;

    // Add cache buster to force reload when action changes
    const gifWithCache = `${finalGifPath}?t=${player.action}`;

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
            style={{
                position: 'absolute',
                left: player.x,
                top: player.y,
                width: `${displaySize}px`,
                height: `${displaySize}px`,
                backgroundImage: `url(${gifWithCache})`,
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
                top: 'calc(50% - 50px)',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                color: activePKSessions.includes(player.id) ? '#e74c3c' : '#aaa',
                textShadow: activePKSessions.includes(player.id)
                    ? '0 0 8px rgba(231, 76, 60, 1), 1px 1px 2px black'
                    : '1px 1px 2px black',
                fontSize: '12px',
                whiteSpace: 'nowrap',
                fontWeight: 'bold',
                pointerEvents: 'none'
            }}>
                {player.username || 'Người chơi khác'}
            </div>

            {/* HP Bar - Chỉ hiển thị khi đang PK */}
            {player.hp !== undefined && player.maxHp && activePKSessions.includes(player.id) && (
                <div style={{
                    position: 'absolute',
                    top: 'calc(50% - 35px)',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
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

            {isNearby && !activePKSessions.includes(player.id) && activePKSessions.length === 0 && (
                <div style={{
                    position: 'absolute',
                    top: 'calc(50% - 70px)',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    display: 'flex',
                    gap: '5px',
                    zIndex: 2001
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

            {/* PK Status Badge */}
            {activePKSessions.includes(player.id) && (
                <div style={{
                    position: 'absolute',
                    top: 'calc(50% - 70px)',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    padding: '4px 8px',
                    backgroundColor: 'rgba(231, 76, 60, 1)',
                    color: 'white',
                    border: '1px solid #c0392b',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                    pointerEvents: 'none'
                }}>
                    ⚔️ PK
                </div>
            )}
        </div>
    );
}, (prevProps, nextProps) => {
    // Custom comparison function for memo
    return (
        prevProps.player.id === nextProps.player.id &&
        prevProps.player.x === nextProps.player.x &&
        prevProps.player.y === nextProps.player.y &&
        prevProps.player.action === nextProps.player.action &&
        prevProps.player.direction === nextProps.player.direction &&
        prevProps.player.hp === nextProps.player.hp &&
        prevProps.playerPosition.x === nextProps.playerPosition.x &&
        prevProps.playerPosition.y === nextProps.playerPosition.y &&
        prevProps.activePKSessions.length === nextProps.activePKSessions.length &&
        prevProps.activePKSessions.includes(prevProps.player.id) === nextProps.activePKSessions.includes(nextProps.player.id)
    );
});

OtherPlayerComponent.displayName = 'OtherPlayerComponent';

const OtherPlayers = () => {
    const { currentMapId, otherPlayers, playerPosition, socket, user, activePKSessions } = useGameStore();

    return (
        <>
            {Array.from(otherPlayers.values())
                .filter((player) => player.mapId === currentMapId) // Chỉ hiển thị người chơi cùng map
                .map((player) => (
                    <OtherPlayerComponent
                        key={player.id}
                        player={player}
                        playerPosition={playerPosition}
                        socket={socket}
                        user={user}
                        activePKSessions={activePKSessions}
                    />
                ))}
        </>
    );
};

export default memo(OtherPlayers);
