'use client';

import React, { useEffect, useState } from 'react';
import { useGameStore } from '@/lib/store';
import { MAPS } from '@/lib/gameData';
import { sendObfuscatedRequest } from '@/lib/requestObfuscator';

const Instructions = () => {
    const [isMobile, setIsMobile] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const { currentMapId, currentChannel, user, setUser, setNotification } = useGameStore();

    useEffect(() => {
        setIsMounted(true);
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const handleLogout = async () => {
        if (!user || isLoggingOut) return;

        const confirmLogout = window.confirm('Bạn có chắc muốn đăng xuất?');
        if (!confirmLogout) return;

        setIsLoggingOut(true);

        try {
            // Call logout API
            const response = await sendObfuscatedRequest('/api/auth/logout', {
                userId: user.id,
                sessionId: user.sessionId,
                token: user.socketToken
            });

            const data = await response.json();

            if (data.success) {
                // Clear user data
                setUser(null);
                
                // Clear localStorage
                localStorage.removeItem('gameState');
                localStorage.removeItem('user');
                
                setNotification({
                    message: 'Đăng xuất thành công!',
                    type: 'success'
                });

                // Reload page to reset state
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

    if (!isMounted) return null;

    const currentMap = MAPS[currentMapId];

    return (
        <>
            {/* Map Name & Channel Display - Top Left */}
            <div style={{
                position: 'fixed',
                top: '15px',
                left: '15px',
                color: 'white',
                backgroundColor: 'rgba(0,0,0,0.6)',
                padding: '8px 14px',
                borderRadius: '6px',
                fontFamily: 'sans-serif',
                zIndex: 100,
                fontSize: '13px',
                border: '1px solid rgba(255,255,255,0.2)',
                backdropFilter: 'blur(4px)',
            }}>
                <div style={{ 
                    fontWeight: 'bold', 
                    marginBottom: '2px',
                    fontSize: '14px',
                }}>
                    📍 {currentMap?.name || 'Unknown'}
                </div>
                {currentChannel && (
                    <div style={{ 
                        fontSize: '11px', 
                        color: '#aaa',
                        fontWeight: 'normal'
                    }}>
                        Kênh {currentChannel}
                    </div>
                )}
            </div>

            {/* User Info & Logout - Top Right */}
            {user && (
                <div style={{
                    position: 'fixed',
                    top: '15px',
                    right: '15px',
                    color: 'white',
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    padding: '8px 14px',
                    borderRadius: '6px',
                    fontFamily: 'sans-serif',
                    zIndex: 100,
                    fontSize: '13px',
                    border: '1px solid rgba(255,255,255,0.2)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                }}>
                    <div>
                        <div style={{ 
                            fontWeight: 'bold', 
                            fontSize: '14px',
                        }}>
                            👤 {user.username}
                        </div>
                        <div style={{ 
                            fontSize: '11px', 
                            color: '#FFD700',
                            fontWeight: 'bold'
                        }}>
                            💰 {user.gold || 0} vàng
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        style={{
                            backgroundColor: isLoggingOut ? 'rgba(100,100,100,0.8)' : 'rgba(231,76,60,0.8)',
                            color: 'white',
                            border: '1px solid rgba(255,255,255,0.3)',
                            borderRadius: '4px',
                            padding: '4px 10px',
                            fontSize: '11px',
                            cursor: isLoggingOut ? 'not-allowed' : 'pointer',
                            fontWeight: 'bold',
                            transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                            if (!isLoggingOut) {
                                e.currentTarget.style.backgroundColor = 'rgba(192,57,43,0.9)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!isLoggingOut) {
                                e.currentTarget.style.backgroundColor = 'rgba(231,76,60,0.8)';
                            }
                        }}
                    >
                        {isLoggingOut ? '...' : '🚪 Đăng xuất'}
                    </button>
                </div>
            )}

            {/* Instructions - Desktop only */}
            {!isMobile && (
                <div style={{
                    position: 'fixed',
                    bottom: '20px',
                    left: '20px',
                    color: 'white',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    padding: '10px',
                    borderRadius: '5px',
                    fontFamily: 'sans-serif',
                    zIndex: 100,
                    fontSize: '12px'
                }}>
                    <p style={{ margin: '5px 0' }}>WASD / Arrows to Move</p>
                    <p style={{ margin: '5px 0' }}>E to Interact</p>
                </div>
            )}
        </>
    );
};

export default Instructions;
