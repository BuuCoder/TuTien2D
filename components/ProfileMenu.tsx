'use client';

import React, { useState } from 'react';
import { useGameStore } from '@/lib/store';
import { sendObfuscatedRequest } from '@/lib/requestObfuscator';

const ProfileMenu = () => {
    const { user, playerStats, setUser, setNotification, socket, currentChannel } = useGameStore();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [showChannelSelect, setShowChannelSelect] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    React.useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    if (!user) return null;

    const handleLogout = async () => {
        if (isLoggingOut) return;

        const confirmLogout = window.confirm('Bạn có chắc muốn đăng xuất?');
        if (!confirmLogout) return;

        setIsLoggingOut(true);
        setIsMenuOpen(false);

        try {
            const response = await sendObfuscatedRequest('/api/auth/logout', {
                userId: user.id,
                sessionId: user.sessionId,
                token: user.socketToken
            });

            const data = await response.json();

            if (data.success) {
                setUser(null);
                localStorage.removeItem('gameState');
                localStorage.removeItem('user');
                
                setNotification({
                    message: 'Đăng xuất thành công!',
                    type: 'success'
                });

                setTimeout(() => {
                    window.location.reload();
                }, 500);
            } else {
                setNotification({
                    message: data.error || 'Đăng xuất thất bại',
                    type: 'error'
                });
                setIsLoggingOut(false);
            }
        } catch (error) {
            console.error('Logout error:', error);
            setNotification({
                message: 'Lỗi kết nối server',
                type: 'error'
            });
            setIsLoggingOut(false);
        }
    };

    const handleChangeChannel = () => {
        setShowChannelSelect(true);
    };

    const handleSelectChannel = (channelId: number) => {
        if (!socket) {
            setNotification({ message: 'Chưa kết nối server', type: 'error' });
            return;
        }

        // Sử dụng logic join_channel giống MultiplayerManager
        const playerPosition = useGameStore.getState().playerPosition;
        const playerDirection = useGameStore.getState().playerDirection;
        const currentMapId = useGameStore.getState().currentMapId;

        socket.emit('join_channel', {
            channelId,
            playerData: {
                x: playerPosition.x,
                y: playerPosition.y,
                direction: playerDirection,
                mapId: currentMapId
            }
        });

        setShowChannelSelect(false);
        setIsMenuOpen(false);
        setNotification({ message: `Đang chuyển sang kênh ${channelId}...`, type: 'info' });
    };

    const hpPercent = (playerStats.currentHp / playerStats.maxHp) * 100;
    const mpPercent = (playerStats.mp / playerStats.maxMp) * 100;

    // Format số tiền với dấu phẩy
    const formatGold = (gold: number) => {
        return gold.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    };

    return (
        <>
            {/* Profile Card */}
            <div
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                style={{
                    position: 'fixed',
                    top: isMobile ? '10px' : '20px',
                    left: isMobile ? '10px' : '20px',
                    backgroundColor: 'rgba(0, 0, 0, 0.85)',
                    borderRadius: isMobile ? '12px' : '16px',
                    padding: isMobile ? '8px' : '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: isMobile ? '8px' : '12px',
                    cursor: 'pointer',
                    zIndex: 1000,
                    border: '2px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                    minWidth: isMobile ? '200px' : '280px',
                    maxWidth: isMobile ? '200px' : 'none',
                    transition: 'all 0.2s',
                    userSelect: 'none',
                }}
                onMouseEnter={(e) => {
                    if (!isMobile) {
                        e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.95)';
                        e.currentTarget.style.borderColor = 'rgba(102, 126, 234, 0.5)';
                    }
                }}
                onMouseLeave={(e) => {
                    if (!isMobile) {
                        e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    }
                }}
            >
                {/* Avatar */}
                <div
                    style={{
                        width: isMobile ? '35px' : '50px',
                        height: isMobile ? '35px' : '50px',
                        borderRadius: '50%',
                        backgroundColor: '#667eea',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: isMobile ? '18px' : '24px',
                        flexShrink: 0,
                        border: '2px solid rgba(255, 255, 255, 0.2)',
                    }}
                >
                    👤
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Username & Level */}
                    <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: isMobile ? '4px' : '8px',
                        marginBottom: isMobile ? '2px' : '4px'
                    }}>
                        <span style={{ 
                            color: 'white', 
                            fontWeight: 'bold',
                            fontSize: isMobile ? '11px' : '14px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                        }}>
                            {user.username}
                        </span>
                        <span style={{
                            backgroundColor: '#667eea',
                            color: 'white',
                            padding: isMobile ? '1px 5px' : '2px 8px',
                            borderRadius: '12px',
                            fontSize: isMobile ? '9px' : '11px',
                            fontWeight: 'bold',
                            flexShrink: 0,
                        }}>
                            Lv.{user.level || 1}
                        </span>
                    </div>

                    {/* Gold */}
                    <div style={{ 
                        color: '#ffd700',
                        fontSize: isMobile ? '10px' : '13px',
                        fontWeight: 'bold',
                        marginBottom: isMobile ? '3px' : '6px'
                    }}>
                        💰 {formatGold(user.gold || 0)}
                    </div>

                    {/* HP Bar */}
                    <div style={{ marginBottom: isMobile ? '2px' : '4px' }}>
                        <div style={{
                            width: '100%',
                            height: isMobile ? '12px' : '18px',
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            borderRadius: isMobile ? '6px' : '9px',
                            overflow: 'hidden',
                            position: 'relative',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                        }}>
                            <div style={{
                                width: `${hpPercent}%`,
                                height: '100%',
                                backgroundColor: hpPercent > 50 ? '#4ade80' : hpPercent > 25 ? '#fbbf24' : '#ef4444',
                                transition: 'width 0.3s, background-color 0.3s',
                            }} />
                            <div style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                color: 'white',
                                fontSize: isMobile ? '8px' : '11px',
                                fontWeight: 'bold',
                                textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                            }}>
                                {playerStats.currentHp}/{playerStats.maxHp}
                            </div>
                        </div>
                    </div>

                    {/* MP Bar */}
                    <div>
                        <div style={{
                            width: '100%',
                            height: isMobile ? '12px' : '18px',
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            borderRadius: isMobile ? '6px' : '9px',
                            overflow: 'hidden',
                            position: 'relative',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                        }}>
                            <div style={{
                                width: `${mpPercent}%`,
                                height: '100%',
                                backgroundColor: '#3b82f6',
                                transition: 'width 0.3s',
                            }} />
                            <div style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                color: 'white',
                                fontSize: isMobile ? '8px' : '11px',
                                fontWeight: 'bold',
                                textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                            }}>
                                {playerStats.mp}/{playerStats.maxMp}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Dropdown Menu */}
            {isMenuOpen && !showChannelSelect && (
                <div
                    style={{
                        position: 'fixed',
                        top: isMobile ? '110px' : '160px',
                        left: isMobile ? '10px' : '20px',
                        backgroundColor: 'rgba(0, 0, 0, 0.95)',
                        borderRadius: '12px',
                        padding: '8px',
                        zIndex: 1001,
                        border: '2px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                        minWidth: isMobile ? '160px' : '200px',
                    }}
                >
                    <button
                        onClick={handleChangeChannel}
                        style={{
                            width: '100%',
                            padding: '12px 16px',
                            backgroundColor: 'transparent',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            textAlign: 'left',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'background-color 0.2s',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(102, 126, 234, 0.3)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                    >
                        🔄 Đổi Kênh
                    </button>
                    <button
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        style={{
                            width: '100%',
                            padding: '12px 16px',
                            backgroundColor: 'transparent',
                            color: isLoggingOut ? '#999' : '#ef4444',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: isLoggingOut ? 'not-allowed' : 'pointer',
                            fontSize: '14px',
                            textAlign: 'left',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'background-color 0.2s',
                        }}
                        onMouseEnter={(e) => {
                            if (!isLoggingOut) {
                                e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                    >
                        🚪 {isLoggingOut ? 'Đang đăng xuất...' : 'Đăng Xuất'}
                    </button>
                </div>
            )}

            {/* Channel Selection Menu */}
            {isMenuOpen && showChannelSelect && (
                <div
                    style={{
                        position: 'fixed',
                        top: isMobile ? '110px' : '160px',
                        left: isMobile ? '10px' : '20px',
                        backgroundColor: 'rgba(0, 0, 0, 0.95)',
                        borderRadius: '12px',
                        padding: '8px',
                        zIndex: 1001,
                        border: '2px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                        minWidth: isMobile ? '160px' : '200px',
                    }}
                >
                    <button
                        onClick={() => setShowChannelSelect(false)}
                        style={{
                            width: '100%',
                            padding: '8px 12px',
                            backgroundColor: 'transparent',
                            color: '#999',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            textAlign: 'left',
                            marginBottom: '4px',
                        }}
                    >
                        ← Quay lại
                    </button>
                    <div style={{ 
                        color: 'white', 
                        fontSize: '13px', 
                        fontWeight: 'bold',
                        padding: '8px 12px',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                        marginBottom: '4px'
                    }}>
                        Chọn kênh:
                    </div>
                    {[1, 2, 3].map((channelId) => (
                        <button
                            key={channelId}
                            onClick={() => handleSelectChannel(channelId)}
                            disabled={currentChannel === channelId}
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                backgroundColor: currentChannel === channelId ? 'rgba(102, 126, 234, 0.3)' : 'transparent',
                                color: currentChannel === channelId ? '#667eea' : 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: currentChannel === channelId ? 'not-allowed' : 'pointer',
                                fontSize: '14px',
                                textAlign: 'left',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                transition: 'background-color 0.2s',
                                opacity: currentChannel === channelId ? 0.7 : 1,
                            }}
                            onMouseEnter={(e) => {
                                if (currentChannel !== channelId) {
                                    e.currentTarget.style.backgroundColor = 'rgba(102, 126, 234, 0.2)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (currentChannel !== channelId) {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                }
                            }}
                        >
                            📡 Kênh {channelId} {currentChannel === channelId && '(Hiện tại)'}
                        </button>
                    ))}
                </div>
            )}

            {/* Click outside to close menu */}
            {isMenuOpen && (
                <div
                    onClick={() => {
                        setIsMenuOpen(false);
                        setShowChannelSelect(false);
                    }}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100vw',
                        height: '100vh',
                        zIndex: 999,
                    }}
                />
            )}
        </>
    );
};

export default ProfileMenu;
