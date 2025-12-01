'use client';

import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useGameStore } from '@/lib/store';

const MultiplayerManager = () => {
    const {
        setSocket,
        socket,
        playerPosition,
        setOtherPlayers,
        updateOtherPlayer,
        removeOtherPlayer,
        currentChannel,
        setCurrentChannel,
        setNotification
    } = useGameStore();

    const [isConnected, setIsConnected] = useState(false);

    // Auto-join logic
    const attemptJoin = (channelId: number) => {
        if (!socket) return;

        console.log(`Attempting to join channel ${channelId}`);
        socket.emit('join_channel', {
            channelId,
            playerData: {
                x: playerPosition.x,
                y: playerPosition.y,
                direction: useGameStore.getState().playerDirection,
                action: useGameStore.getState().playerAction
            }
        });
    };

    useEffect(() => {
        // Use the provided URL if in production or if explicitly set, otherwise default to same-origin (localhost)
        // This fixes the issue where local dev cannot connect to a non-existent or blocked remote URL
        const isProduction = process.env.NODE_ENV === 'production';
        const socketUrl = isProduction ? 'https://socket.phatdatbatdongsan.com' : undefined;

        console.log('Connecting to socket at:', socketUrl || 'localhost');

        const socketInstance = io(socketUrl, {
            transports: ['websocket'],
            secure: true,
            reconnectionAttempts: 5,
        });

        socketInstance.on('connect', () => {
            console.log('Connected to socket server');
            setIsConnected(true);
            // Auto-join channel 1 on connect
            attemptJoin(1);
        });

        socketInstance.on('disconnect', () => {
            console.log('Disconnected from socket server');
            setIsConnected(false);
            setCurrentChannel(null);
        });

        socketInstance.on('channel_joined', ({ channelId, players }) => {
            console.log(`Joined channel ${channelId} with ${players.length} players`);
            setCurrentChannel(channelId);

            // Convert array to Map
            const playersMap = new Map();
            players.forEach((p: any) => {
                if (p.id !== socketInstance.id) {
                    playersMap.set(p.id, p);
                }
            });
            setOtherPlayers(playersMap);
            setNotification({ message: `Đã vào kênh ${channelId}`, type: 'success' });
        });

        socketInstance.on('channel_full', ({ channelId }) => {
            console.log(`Channel ${channelId} is full`);
            // Try next channel
            const nextChannel = channelId + 1;
            if (nextChannel <= 3) {
                setNotification({ message: `Kênh ${channelId} đầy, đang chuyển sang kênh ${nextChannel}...`, type: 'info' });
                setTimeout(() => attemptJoin(nextChannel), 1000);
            } else {
                setNotification({ message: 'Tất cả các kênh đều đầy!', type: 'error' });
            }
        });

        socketInstance.on('player_joined', (player) => {
            console.log('Player joined:', player);
            updateOtherPlayer(player.id, player);
            setNotification({ message: 'Có người chơi mới tham gia', type: 'info' });
        });

        socketInstance.on('player_moved', (data) => {
            updateOtherPlayer(data.id, data);
        });

        socketInstance.on('player_left', (playerId) => {
            console.log('Player left:', playerId);
            removeOtherPlayer(playerId);
        });

        socketInstance.on('error', (message) => {
            setNotification({ message, type: 'error' });
        });

        setSocket(socketInstance);

        return () => {
            socketInstance.disconnect();
        };
    }, [setSocket, setCurrentChannel, setOtherPlayers, updateOtherPlayer, removeOtherPlayer, setNotification]);

    // Broadcast movement
    useEffect(() => {
        if (socket && isConnected && currentChannel) {
            socket.emit('player_move', {
                x: playerPosition.x,
                y: playerPosition.y,
                direction: useGameStore.getState().playerDirection,
                action: useGameStore.getState().playerAction
            });
        }
    }, [playerPosition, socket, isConnected, currentChannel]);

    const joinChannel = (channelId: number) => {
        attemptJoin(channelId);
    };

    return (
        <div style={{
            position: 'fixed',
            top: '10px',
            right: '10px',
            backgroundColor: 'rgba(0,0,0,0.8)',
            padding: '15px',
            borderRadius: '12px',
            color: 'white',
            zIndex: 10000,
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            minWidth: '200px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            border: '1px solid rgba(255,255,255,0.1)'
        }}>
            <div style={{
                fontSize: '14px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                paddingBottom: '8px'
            }}>
                <div style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: isConnected ? '#4CAF50' : '#f44336',
                    boxShadow: isConnected ? '0 0 8px #4CAF50' : 'none'
                }} />
                {isConnected ? 'Đã kết nối máy chủ' : 'Mất kết nối'}
            </div>

            <div style={{ fontSize: '13px' }}>
                <span style={{ color: '#aaa' }}>Trạng thái: </span>
                <span style={{ color: currentChannel ? '#4CAF50' : '#ff9800' }}>
                    {currentChannel ? `Đang ở Kênh ${currentChannel}` : 'Chưa vào kênh'}
                </span>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
                {[1, 2, 3].map(channel => (
                    <button
                        key={channel}
                        onClick={() => joinChannel(channel)}
                        disabled={!isConnected || currentChannel === channel}
                        style={{
                            flex: 1,
                            padding: '8px 4px',
                            backgroundColor: currentChannel === channel ? '#4CAF50' : 'rgba(255,255,255,0.1)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '6px',
                            color: 'white',
                            cursor: (!isConnected || currentChannel === channel) ? 'default' : 'pointer',
                            fontSize: '12px',
                            transition: 'all 0.2s',
                            opacity: (!isConnected) ? 0.5 : 1
                        }}
                    >
                        Kênh {channel}
                    </button>
                ))}
            </div>

            {!isConnected && (
                <div style={{ fontSize: '11px', color: '#f44336', marginTop: '5px' }}>
                    Không thể kết nối đến socket.phatdatbatdongsan.com
                </div>
            )}
        </div>
    );
};

export default MultiplayerManager;
