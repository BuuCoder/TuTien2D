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
    const [isInitialJoin, setIsInitialJoin] = useState(true); // Track if this is the first join

    // Hàm join channel sử dụng socket instance được truyền vào
    // để tránh lỗi stale closure
    const joinChannelWithSocket = (socketInstance: any, channelId: number, showNotification = true) => {
        
        const currentUser = useGameStore.getState().user;
        socketInstance.emit('join_channel', {
            channelId,
            playerData: {
                x: useGameStore.getState().playerPosition.x,
                y: useGameStore.getState().playerPosition.y,
                direction: useGameStore.getState().playerDirection,
                action: useGameStore.getState().playerAction,
                mapId: useGameStore.getState().currentMapId,
                skin: currentUser?.skin || 'knight'
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
            const previousChannel = useGameStore.getState().currentChannel;
            console.log(`[Channel] Joined channel ${channelId}, previous: ${previousChannel}, isInitial: ${isInitialJoin}`);
            
            setCurrentChannel(channelId);

            const playersMap = new Map();
            players.forEach((p: any) => {
                if (p.id !== socketInstance.id) {
                    playersMap.set(p.id, p);
                }
            });
            setOtherPlayers(playersMap);
            
            // Only show notification if:
            // 1. Not initial join
            // 2. Actually changing channel (not reconnecting to same channel)
            if (!isInitialJoin && previousChannel !== channelId) {
                setNotification({ message: `Đã vào kênh ${channelId}`, type: 'success' });
            }
            
            // Mark that initial join is complete
            if (isInitialJoin) {
                setIsInitialJoin(false);
            }

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
                
                // Người thắng giữ nguyên HP/MP hiện tại
                setNotification({
                    message: '🏆 Đối thủ đã ngắt kết nối - Bạn thắng!',
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
            mapId: currentMapId,
            skin: user?.skin || 'knight'
        });
    }, [playerPosition, playerDirection, playerAction, currentMapId, socket, isConnected, currentChannel]);

    return null;
};

export default MultiplayerManager;

