'use client';

import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useGameStore } from '@/lib/store';

const MultiplayerManager = () => {
    const {
        setSocket,
        socket, // Vẫn giữ để dùng cho các effect khác
        currentMapId,
        playerPosition,
        playerDirection,
        playerAction,
        setOtherPlayers,
        updateOtherPlayer,
        removeOtherPlayer,
        currentChannel,
        setCurrentChannel,
        setNotification,
        user
    } = useGameStore();

    const [isConnected, setIsConnected] = useState(false);
    const [isOpen, setIsOpen] = useState(false); // Mặc định đóng

    // Hàm join channel sử dụng socket instance được truyền vào
    // để tránh lỗi stale closure
    const joinChannelWithSocket = (socketInstance: any, channelId: number) => {
        
        socketInstance.emit('join_channel', {
            channelId,
            playerData: {
                x: useGameStore.getState().playerPosition.x,
                y: useGameStore.getState().playerPosition.y,
                direction: useGameStore.getState().playerDirection,
                action: useGameStore.getState().playerAction,
                mapId: useGameStore.getState().currentMapId
            }
        });
    };

    // Effect để validate session khi có socket và user (gửi kèm token)
    useEffect(() => {
        if (socket && isConnected && user) {
            
            socket.emit('validate_session', {
                userId: user.id,
                sessionId: user.sessionId,
                username: user.username,
                token: user.socketToken // Gửi JWT token để xác thực
            });
        }
    }, [socket, isConnected, user]);

    useEffect(() => {
        // Socket server runs on the same server as Next.js (server.js)
        // No need for separate socket URL
        

        const socketInstance = io({
            transports: ['websocket'],
            reconnectionAttempts: 5,
        });

        socketInstance.on('connect', () => {
            
            setIsConnected(true);
        });

        socketInstance.on('session_validated', ({ success }: any) => {
            if (success) {
                
                // Sử dụng socketInstance trực tiếp
                joinChannelWithSocket(socketInstance, 1);
            }
        });

        socketInstance.on('session_replaced', ({ message }: any) => {
            setNotification({ message, type: 'error' });
            setTimeout(() => {
                useGameStore.getState().setUser(null);
            }, 2000);
        });

        socketInstance.on('disconnect', () => {
            
            setIsConnected(false);
            setCurrentChannel(null);
        });

        socketInstance.on('channel_joined', ({ channelId, players }: any) => {
            
            setCurrentChannel(channelId);

            const playersMap = new Map();
            players.forEach((p: any) => {
                if (p.id !== socketInstance.id) {
                    playersMap.set(p.id, p);
                }
            });
            setOtherPlayers(playersMap);
            setNotification({ message: `Đã vào kênh ${channelId}`, type: 'success' });

            // Request monsters for current map after joining channel
            const currentMapId = useGameStore.getState().currentMapId;
            socketInstance.emit('request_monsters', { mapId: currentMapId });
        });

        socketInstance.on('channel_full', ({ channelId }: any) => {
            
            const nextChannel = channelId + 1;
            if (nextChannel <= 3) {
                setNotification({ message: `Kênh ${channelId} đầy, đang chuyển sang kênh ${nextChannel}...`, type: 'info' });
                setTimeout(() => joinChannelWithSocket(socketInstance, nextChannel), 1000);
            } else {
                setNotification({ message: 'Tất cả các kênh đều đầy! Đang thử lại kênh 1...', type: 'info' });
                setTimeout(() => joinChannelWithSocket(socketInstance, 1), 3000);
            }
        });

        socketInstance.on('player_joined', (player: any) => {
            
            updateOtherPlayer(player.id, player);
            
            // Only show notification if player is on the same map
            const currentMapId = useGameStore.getState().currentMapId;
            if (player.mapId === currentMapId) {
                setNotification({ message: `${player.username || 'Người chơi'} đã vào.`, type: 'info' });
            }
        });

        socketInstance.on('player_moved', (data: any) => {
            updateOtherPlayer(data.id, data);
            
            // Show notification when player enters current map
            const currentMapId = useGameStore.getState().currentMapId;
            const otherPlayers = useGameStore.getState().otherPlayers;
            const previousPlayer = otherPlayers.get(data.id);
            
            // If player just entered this map (mapId changed to current map)
            if (previousPlayer && previousPlayer.mapId !== currentMapId && data.mapId === currentMapId) {
                setNotification({ message: `${data.username || 'Người chơi'} đã vào map`, type: 'info' });
            }
        });

        socketInstance.on('player_left', (playerId: string) => {
            
            
            // Check if this player was in active PK session
            const state = useGameStore.getState();
            if (state.activePKSessions.includes(playerId)) {
                
                
                // Remove from PK session
                state.removePKSession(playerId);
                
                // Restore HP/Mana (winner gets full recovery)
                state.setPlayerStats({
                    currentHp: state.playerStats.maxHp,
                    mp: state.playerStats.maxMp
                });
                
                // Emit HP update
                if (socketInstance) {
                    socketInstance.emit('update_hp', {
                        hp: state.playerStats.maxHp,
                        maxHp: state.playerStats.maxHp,
                        opponentId: null,
                        isPK: false
                    });
                }
                
                // Show victory notification
                setNotification({
                    message: '🏆 Đối thủ đã ngắt kết nối - Bạn thắng! 💚 HP đã hồi phục!',
                    type: 'success'
                });
                
                // Disable PK mode if no more active sessions
                if (state.activePKSessions.length === 0) {
                    state.setIsPKMode(false);
                }
            }
            
            removeOtherPlayer(playerId);
        });

        socketInstance.on('friend_request_error', ({ message }: any) => {
            setNotification({ message, type: 'error' });
        });

        socketInstance.on('auth_error', ({ message }: any) => {
            
            setNotification({ 
                message: message + ' - Vui lòng đăng nhập lại', 
                type: 'error' 
            });
            
            // Clear localStorage để xóa token cũ
            localStorage.removeItem('tutien2d_user');
            localStorage.removeItem('tutien2d_playerStats');
            
            // Đăng xuất user
            setTimeout(() => {
                useGameStore.getState().setUser(null);
            }, 2000);
        });

        socketInstance.on('error', (message: string) => {
            setNotification({ message, type: 'error' });
        });

        setSocket(socketInstance);

        return () => {
            socketInstance.disconnect();
        };
    }, [setSocket, setCurrentChannel, setOtherPlayers, updateOtherPlayer, removeOtherPlayer, setNotification]);

    // Broadcast player movement with throttling using ref
    const lastBroadcastTime = React.useRef(0);
    const lastAction = React.useRef(playerAction);
    
    useEffect(() => {
        if (!socket || !isConnected || !currentChannel) return;

        const now = Date.now();
        const timeSinceLastBroadcast = now - lastBroadcastTime.current;
        const actionChanged = lastAction.current !== playerAction;

        // Always broadcast if action changed (idle/run), otherwise throttle
        if (!actionChanged && timeSinceLastBroadcast < 50) {
            return;
        }

        lastBroadcastTime.current = now;
        lastAction.current = playerAction;
        
        // Log when action changes
        if (actionChanged) {
            
        }
        
        socket.emit('player_move', {
            x: playerPosition.x,
            y: playerPosition.y,
            direction: playerDirection,
            action: playerAction,
            mapId: currentMapId
        });
    }, [playerPosition, playerDirection, playerAction, currentMapId, socket, isConnected, currentChannel]);

    const handleManualJoin = (channelId: number) => {
        if (socket) {
            joinChannelWithSocket(socket, channelId);
        }
    };

    return (
        <>
            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    position: 'fixed',
                    top: '15px',
                    right: '15px',
                    width: '40px',
                    height: '40px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: 'white',
                    cursor: 'pointer',
                    zIndex: 10001,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    backdropFilter: 'blur(4px)',
                    transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.85)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.7)';
                }}
            >
                {isOpen ? '✕' : '☰'}
            </button>

            {/* Panel */}
            {isOpen && (
                <div style={{
                    position: 'fixed',
                    top: '65px',
                    right: '15px',
                    backgroundColor: 'rgba(0,0,0,0.85)',
                    padding: '15px',
                    borderRadius: '12px',
                    color: 'white',
                    zIndex: 10000,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    minWidth: '220px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(8px)',
                    animation: 'slideIn 0.2s ease-out',
                }}>
                    <style jsx>{`
                        @keyframes slideIn {
                            from {
                                opacity: 0;
                                transform: translateY(-10px);
                            }
                            to {
                                opacity: 1;
                                transform: translateY(0);
                            }
                        }
                    `}</style>

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
                        {isConnected ? 'Đã kết nối' : 'Mất kết nối'}
                    </div>

                    <div style={{ fontSize: '12px' }}>
                        <span style={{ color: '#aaa' }}>Trạng thái: </span>
                        <span style={{ color: currentChannel ? '#4CAF50' : '#ff9800' }}>
                            {currentChannel ? `Kênh ${currentChannel}` : 'Chưa vào kênh'}
                        </span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        {[1, 2, 3].map(channel => (
                            <button
                                key={channel}
                                onClick={() => handleManualJoin(channel)}
                                disabled={!isConnected || currentChannel === channel}
                                style={{
                                    flex: 1,
                                    padding: '8px 4px',
                                    backgroundColor: currentChannel === channel ? '#4CAF50' : 'rgba(255,255,255,0.1)',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    borderRadius: '6px',
                                    color: 'white',
                                    cursor: (!isConnected || currentChannel === channel) ? 'default' : 'pointer',
                                    fontSize: '11px',
                                    transition: 'all 0.2s',
                                    opacity: (!isConnected) ? 0.5 : 1,
                                    fontWeight: currentChannel === channel ? 'bold' : 'normal'
                                }}
                            >
                                {channel}
                            </button>
                        ))}
                    </div>

                    {!isConnected && (
                        <div style={{ fontSize: '10px', color: '#f44336', marginTop: '2px' }}>
                            Không thể kết nối máy chủ
                        </div>
                    )}
                </div>
            )}
        </>
    );
};

export default MultiplayerManager;

