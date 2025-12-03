'use client';

import React, { useState } from 'react';
import { useGameStore } from '@/lib/store';
import { MAPS } from '@/lib/gameData';

const MapName = () => {
    const { currentMapId, socket, currentChannel, setNotification } = useGameStore();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isConnected, setIsConnected] = useState(false);

    // Check socket connection status
    React.useEffect(() => {
        if (!socket) {
            setIsConnected(false);
            return;
        }

        const checkConnection = () => {
            setIsConnected(socket.connected);
        };

        checkConnection();
        socket.on('connect', checkConnection);
        socket.on('disconnect', checkConnection);

        return () => {
            socket.off('connect', checkConnection);
            socket.off('disconnect', checkConnection);
        };
    }, [socket]);
    
    const currentMap = MAPS[currentMapId];
    if (!currentMap) return null;

    const handleSelectChannel = (channelId: number) => {
        if (!socket) {
            setNotification({ message: 'Chưa kết nối server', type: 'error' });
            return;
        }

        if (channelId === currentChannel) {
            setIsMenuOpen(false);
            return;
        }

        const playerPosition = useGameStore.getState().playerPosition;
        const playerDirection = useGameStore.getState().playerDirection;

        socket.emit('join_channel', {
            channelId,
            playerData: {
                x: playerPosition.x,
                y: playerPosition.y,
                direction: playerDirection,
                mapId: currentMapId
            }
        });

        setIsMenuOpen(false);
        setNotification({ message: `Đang chuyển sang kênh ${channelId}...`, type: 'info' });
    };

    return (
        <>
            {/* Map Name & Channel Button */}
            <div
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                style={{
                    position: 'fixed',
                    top: '16px',
                    right: '16px',
                    backgroundColor: 'rgba(17, 17, 17, 0.95)',
                    borderRadius: '8px',
                    padding: '10px 16px',
                    zIndex: 1000,
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
                    userSelect: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(24, 24, 24, 0.98)';
                    e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.4)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(17, 17, 17, 0.95)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                }}
            >
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                }}>
                    <div style={{
                        color: '#f9fafb',
                        fontSize: '14px',
                        fontWeight: '600',
                        letterSpacing: '-0.01em',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}>
                        <span style={{ fontSize: '16px' }}>📍</span>
                        {currentMap.name}
                    </div>
                    <div style={{
                        width: '28px',
                        height: '28px',
                        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(37, 99, 235, 0.2) 100%)',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#60a5fa',
                        fontSize: '13px',
                        fontWeight: '700',
                        letterSpacing: '-0.02em'
                    }}>
                        {currentChannel || '?'}
                    </div>
                </div>
            </div>

            {/* Channel Selection Menu */}
            {isMenuOpen && (
                <>
                    <div
                        style={{
                            position: 'fixed',
                            top: '60px',
                            right: '16px',
                            backgroundColor: 'rgba(17, 17, 17, 0.98)',
                            borderRadius: '8px',
                            padding: '10px',
                            zIndex: 1001,
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5)',
                            minWidth: '170px',
                        }}
                    >
                        {/* Connection Status */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 8px',
                            marginBottom: '8px',
                            backgroundColor: 'rgba(255, 255, 255, 0.04)',
                            borderRadius: '4px',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                        }}>
                            <div style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                backgroundColor: isConnected ? '#10b981' : '#ef4444',
                                boxShadow: isConnected 
                                    ? '0 0 6px rgba(16, 185, 129, 0.6)' 
                                    : '0 0 6px rgba(239, 68, 68, 0.6)',
                            }} />
                            <span style={{
                                color: isConnected ? '#10b981' : '#ef4444',
                                fontSize: '11px',
                                fontWeight: '600',
                                letterSpacing: '-0.01em'
                            }}>
                                {isConnected ? 'Đã kết nối' : 'Mất kết nối'}
                            </span>
                        </div>

                        {/* Channel Title */}
                        <div style={{ 
                            color: '#9ca3af', 
                            fontSize: '11px', 
                            fontWeight: '600',
                            padding: '4px 8px',
                            marginBottom: '6px',
                            letterSpacing: '-0.01em',
                            textTransform: 'uppercase'
                        }}>
                            Chọn kênh
                        </div>

                        {/* Channel Grid */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: '6px',
                        }}>
                            {[1, 2, 3].map((channelId) => {
                                const isActive = currentChannel === channelId;
                                return (
                                    <button
                                        key={channelId}
                                        onClick={() => handleSelectChannel(channelId)}
                                        disabled={!isConnected}
                                        style={{
                                            width: '48px',
                                            height: '48px',
                                            background: isActive
                                                ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.25) 0%, rgba(37, 99, 235, 0.25) 100%)'
                                                : 'rgba(255, 255, 255, 0.04)',
                                            border: isActive
                                                ? '1.5px solid rgba(59, 130, 246, 0.5)'
                                                : '1px solid rgba(255, 255, 255, 0.08)',
                                            borderRadius: '6px',
                                            color: isActive ? '#60a5fa' : '#f9fafb',
                                            fontSize: '18px',
                                            fontWeight: '700',
                                            cursor: isConnected ? 'pointer' : 'not-allowed',
                                            transition: 'all 0.15s ease',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            opacity: isConnected ? 1 : 0.5,
                                            letterSpacing: '-0.02em',
                                            position: 'relative',
                                        }}
                                        onMouseEnter={(e) => {
                                            if (isConnected && !isActive) {
                                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                                                e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (isConnected && !isActive) {
                                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                                            }
                                        }}
                                    >
                                        {channelId}
                                        {isActive && (
                                            <div style={{
                                                position: 'absolute',
                                                top: '3px',
                                                right: '3px',
                                                width: '5px',
                                                height: '5px',
                                                borderRadius: '50%',
                                                backgroundColor: '#10b981',
                                                boxShadow: '0 0 6px rgba(16, 185, 129, 0.8)',
                                            }} />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Click outside to close */}
                    <div
                        onClick={() => setIsMenuOpen(false)}
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            width: '100vw',
                            height: '100vh',
                            zIndex: 999,
                        }}
                    />
                </>
            )}
        </>
    );
};

export default MapName;
