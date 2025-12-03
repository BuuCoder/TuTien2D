'use client';

import React, { useState } from 'react';
import { useGameStore } from '@/lib/store';
import { sendObfuscatedRequest } from '@/lib/requestObfuscator';

const ProfileMenu = () => {
    const { user, playerStats, setUser, setNotification } = useGameStore();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
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
                    top: isMobile ? '12px' : '16px',
                    left: isMobile ? '12px' : '16px',
                    backgroundColor: 'rgba(17, 17, 17, 0.95)',
                    borderRadius: '8px',
                    padding: isMobile ? '10px' : '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: isMobile ? '10px' : '14px',
                    cursor: 'pointer',
                    zIndex: 1000,
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
                    minWidth: isMobile ? '200px' : '280px',
                    maxWidth: isMobile ? '200px' : 'none',
                    transition: 'all 0.15s ease',
                    userSelect: 'none',
                }}
                onMouseEnter={(e) => {
                    if (!isMobile) {
                        e.currentTarget.style.backgroundColor = 'rgba(24, 24, 24, 0.98)';
                        e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.4)';
                    }
                }}
                onMouseLeave={(e) => {
                    if (!isMobile) {
                        e.currentTarget.style.backgroundColor = 'rgba(17, 17, 17, 0.95)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                    }
                }}
            >
                {/* Avatar */}
                <div
                    style={{
                        width: isMobile ? '36px' : '48px',
                        height: isMobile ? '36px' : '48px',
                        borderRadius: '6px',
                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: isMobile ? '18px' : '24px',
                        flexShrink: 0,
                        border: '1px solid rgba(255, 255, 255, 0.1)',
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
                        gap: isMobile ? '6px' : '8px',
                        marginBottom: isMobile ? '4px' : '6px'
                    }}>
                        <span style={{ 
                            color: '#f9fafb', 
                            fontWeight: '600',
                            fontSize: isMobile ? '12px' : '14px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            letterSpacing: '-0.01em'
                        }}>
                            {user.username}
                        </span>
                        <span style={{
                            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                            color: 'white',
                            padding: isMobile ? '2px 6px' : '3px 8px',
                            borderRadius: '4px',
                            fontSize: isMobile ? '9px' : '10px',
                            fontWeight: '600',
                            flexShrink: 0,
                            letterSpacing: '0.02em'
                        }}>
                            Lv.{user.level || 1}
                        </span>
                    </div>

                    {/* Gold */}
                    <div style={{ 
                        color: '#fbbf24',
                        fontSize: isMobile ? '11px' : '13px',
                        fontWeight: '600',
                        marginBottom: isMobile ? '4px' : '6px',
                        letterSpacing: '-0.01em'
                    }}>
                        💰 {formatGold(user.gold || 0)}
                    </div>

                    {/* HP Bar */}
                    <div style={{ marginBottom: isMobile ? '3px' : '4px' }}>
                        <div style={{
                            width: '100%',
                            height: isMobile ? '14px' : '16px',
                            backgroundColor: 'rgba(255, 255, 255, 0.06)',
                            borderRadius: '4px',
                            overflow: 'hidden',
                            position: 'relative',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                        }}>
                            <div style={{
                                width: `${hpPercent}%`,
                                height: '100%',
                                background: 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)',
                                transition: 'width 0.3s ease',
                            }} />
                            <div style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                color: 'white',
                                fontSize: isMobile ? '9px' : '10px',
                                fontWeight: '600',
                                textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                                letterSpacing: '-0.02em'
                            }}>
                                {playerStats.currentHp}/{playerStats.maxHp}
                            </div>
                        </div>
                    </div>

                    {/* MP Bar */}
                    <div>
                        <div style={{
                            width: '100%',
                            height: isMobile ? '14px' : '16px',
                            backgroundColor: 'rgba(255, 255, 255, 0.06)',
                            borderRadius: '4px',
                            overflow: 'hidden',
                            position: 'relative',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                        }}>
                            <div style={{
                                width: `${mpPercent}%`,
                                height: '100%',
                                background: 'linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)',
                                transition: 'width 0.3s ease',
                            }} />
                            <div style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                color: 'white',
                                fontSize: isMobile ? '9px' : '10px',
                                fontWeight: '600',
                                textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                                letterSpacing: '-0.02em'
                            }}>
                                {playerStats.mp}/{playerStats.maxMp}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Dropdown Menu */}
            {isMenuOpen && (
                <div
                    style={{
                        position: 'fixed',
                        top: isMobile ? '110px' : '150px',
                        left: isMobile ? '12px' : '16px',
                        backgroundColor: 'rgba(17, 17, 17, 0.98)',
                        borderRadius: '8px',
                        padding: '6px',
                        zIndex: 1001,
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5)',
                        minWidth: isMobile ? '160px' : '200px',
                    }}
                >
                    <button
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        style={{
                            width: '100%',
                            padding: '10px 12px',
                            backgroundColor: 'transparent',
                            color: isLoggingOut ? '#6b7280' : '#ef4444',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: isLoggingOut ? 'not-allowed' : 'pointer',
                            fontSize: '13px',
                            fontWeight: '500',
                            textAlign: 'left',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'background-color 0.15s ease',
                            letterSpacing: '-0.01em'
                        }}
                        onMouseEnter={(e) => {
                            if (!isLoggingOut) {
                                e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
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

            {/* Click outside to close menu */}
            {isMenuOpen && (
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
            )}
        </>
    );
};

export default ProfileMenu;
