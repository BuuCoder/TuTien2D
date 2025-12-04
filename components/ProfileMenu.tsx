'use client';

import React, { useState } from 'react';
import { useGameStore } from '@/lib/store';
import { sendObfuscatedRequest } from '@/lib/requestObfuscator';
import { formatSkinStats, SKINS } from '@/lib/skinData';
import { calculatePlayerStats, calculatePlayerSpeed } from '@/lib/skinStatsHelper';

const ProfileMenu = () => {
    const { user, playerStats, setUser, setNotification, setPlayerStats } = useGameStore();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [showSkinSelector, setShowSkinSelector] = useState(false);
    const [skins, setSkins] = useState<any[]>([]);
    const [loadingSkins, setLoadingSkins] = useState(false);
    const [equippingSkin, setEquippingSkin] = useState(false);
    const [showStatsTooltip, setShowStatsTooltip] = useState(false);

    React.useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    if (!user) return null;

    const loadSkins = async () => {
        if (!user) return;
        
        setLoadingSkins(true);
        try {
            const response = await sendObfuscatedRequest('/api/skin/list', {
                userId: user.id,
                sessionId: user.sessionId,
                token: user.socketToken
            });

            const data = await response.json();
            console.log('[ProfileMenu] Skin list response:', data);

            if (data.success) {
                // Chỉ lấy skin đã sở hữu
                const ownedSkins = data.skins.filter((s: any) => s.owned);
                console.log('[ProfileMenu] Owned skins:', ownedSkins);
                setSkins(ownedSkins);
            } else {
                console.error('[ProfileMenu] Failed to load skins:', data.error);
                setNotification({
                    message: data.error || 'Không thể tải danh sách trang phục',
                    type: 'error'
                });
            }
        } catch (error) {
            console.error('[ProfileMenu] Error loading skins:', error);
            setNotification({
                message: 'Không thể tải danh sách trang phục',
                type: 'error'
            });
        } finally {
            setLoadingSkins(false);
        }
    };

    const handleOpenSkinSelector = () => {
        setIsMenuOpen(false);
        setShowSkinSelector(true);
        loadSkins();
    };

    const handleEquipSkin = async (skinId: string) => {
        if (equippingSkin || !user) return;

        setEquippingSkin(true);
        try {
            const response = await sendObfuscatedRequest('/api/skin/equip', {
                userId: user.id,
                sessionId: user.sessionId,
                token: user.socketToken,
                skinId: skinId
            });

            const data = await response.json();
            console.log('[ProfileMenu] Equip skin response:', data);

            if (data.success) {
                console.log('[ProfileMenu] Updating stats:', data.stats);
                
                // Update user skin
                setUser({ ...user, skin: skinId });
                
                // Update stats từ server response
                if (data.stats) {
                    setPlayerStats({
                        maxHp: data.stats.maxHp,
                        currentHp: data.stats.hp,
                        maxMp: data.stats.maxMp,
                        mp: data.stats.mp,
                        attack: data.stats.attack,
                        defense: data.stats.defense
                    });
                    
                    console.log('[ProfileMenu] Stats updated:', {
                        attack: data.stats.attack,
                        defense: data.stats.defense,
                        maxHp: data.stats.maxHp,
                        maxMp: data.stats.maxMp
                    });
                }
                
                // Reload skins to update equipped status
                await loadSkins();
                
                setNotification({
                    message: data.message,
                    type: 'success'
                });
            } else {
                setNotification({
                    message: data.error || 'Không thể trang bị',
                    type: 'error'
                });
            }
        } catch (error: any) {
            console.error('[ProfileMenu] Error equipping skin:', error);
            setNotification({
                message: error.message || 'Lỗi khi trang bị',
                type: 'error'
            });
        } finally {
            setEquippingSkin(false);
        }
    };

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

    // Calculate skin bonuses for display
    const currentSkin = user?.skin || 'knight';
    const skinStats = calculatePlayerStats(currentSkin);
    const skinSpeed = calculatePlayerSpeed(currentSkin);
    const hasBonus = currentSkin !== 'knight';
    
    // Get bonuses directly from skin data
    const skinData = SKINS[currentSkin];
    const hpBonus = skinData?.stats?.maxHpBonus || 0;
    const mpBonus = skinData?.stats?.maxMpBonus || 0;
    const attackBonus = skinData?.stats?.attackBonus || 0;
    const defenseBonus = skinData?.stats?.defenseBonus || 0;
    const speedBonus = skinData?.stats?.speedBonus || 0;

    // Debug log
    React.useEffect(() => {
        console.log('[ProfileMenu] Current stats:', {
            skin: currentSkin,
            attack: playerStats.attack,
            defense: playerStats.defense,
            attackBonus,
            defenseBonus
        });
    }, [currentSkin, playerStats.attack, playerStats.defense, attackBonus, defenseBonus]);

    return (
        <>
            {/* Profile Card */}
            <div
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                onMouseEnter={() => !isMobile && setShowStatsTooltip(true)}
                onMouseLeave={() => !isMobile && setShowStatsTooltip(false)}
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
                                {hpBonus > 0 && (
                                    <span style={{ color: '#10B981', marginLeft: '2px' }}>
                                        (+{hpBonus})
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* MP Bar */}
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
                                {mpBonus > 0 && (
                                    <span style={{ color: '#10B981', marginLeft: '2px' }}>
                                        (+{mpBonus})
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Attack & Defense */}
                    <div style={{ 
                        display: 'flex', 
                        gap: isMobile ? '4px' : '6px',
                        fontSize: isMobile ? '9px' : '10px',
                        color: '#9CA3AF'
                    }}>
                        <div style={{ 
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2px'
                        }}>
                            <span>⚔️</span>
                            <span style={{ color: attackBonus > 0 ? '#10B981' : '#9CA3AF' }}>
                                {playerStats.attack}
                            </span>
                        </div>
                        <div style={{ 
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2px'
                        }}>
                            <span>🛡️</span>
                            <span style={{ color: defenseBonus > 0 ? '#10B981' : '#9CA3AF' }}>
                                {playerStats.defense}
                            </span>
                        </div>
                        {speedBonus > 0 && (
                            <div style={{ 
                                flex: 1,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '2px'
                            }}>
                                <span>⚡</span>
                                <span style={{ color: '#10B981' }}>
                                    +{speedBonus}%
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Skin Bonus Indicator */}
                {hasBonus && (
                    <div style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                        color: 'white',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '9px',
                        fontWeight: '600',
                        letterSpacing: '0.02em',
                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
                    }}>
                        ⚡ BUFF
                    </div>
                )}
            </div>

            {/* Stats Tooltip */}
            {showStatsTooltip && hasBonus && !isMenuOpen && (
                <div
                    style={{
                        position: 'fixed',
                        top: isMobile ? '110px' : '150px',
                        left: isMobile ? '12px' : '16px',
                        backgroundColor: 'rgba(17, 17, 17, 0.98)',
                        borderRadius: '8px',
                        padding: '12px',
                        zIndex: 1001,
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5)',
                        minWidth: '200px',
                        pointerEvents: 'none',
                    }}
                >
                    <div style={{
                        color: '#10B981',
                        fontSize: '12px',
                        fontWeight: '600',
                        marginBottom: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}>
                        ⚡ Skin Bonuses
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {hpBonus > 0 && (
                            <div style={{ color: '#EF4444', fontSize: '11px', display: 'flex', justifyContent: 'space-between' }}>
                                <span>❤️ Max HP</span>
                                <span style={{ color: '#10B981' }}>+{hpBonus}</span>
                            </div>
                        )}
                        {mpBonus > 0 && (
                            <div style={{ color: '#3B82F6', fontSize: '11px', display: 'flex', justifyContent: 'space-between' }}>
                                <span>💙 Max MP</span>
                                <span style={{ color: '#10B981' }}>+{mpBonus}</span>
                            </div>
                        )}
                        {attackBonus > 0 && (
                            <div style={{ color: '#F59E0B', fontSize: '11px', display: 'flex', justifyContent: 'space-between' }}>
                                <span>⚔️ Attack</span>
                                <span style={{ color: '#10B981' }}>+{attackBonus}</span>
                            </div>
                        )}
                        {defenseBonus > 0 && (
                            <div style={{ color: '#8B5CF6', fontSize: '11px', display: 'flex', justifyContent: 'space-between' }}>
                                <span>🛡️ Defense</span>
                                <span style={{ color: '#10B981' }}>+{defenseBonus}</span>
                            </div>
                        )}
                        {speedBonus > 0 && (
                            <div style={{ color: '#06B6D4', fontSize: '11px', display: 'flex', justifyContent: 'space-between' }}>
                                <span>⚡ Speed</span>
                                <span style={{ color: '#10B981' }}>+{speedBonus}%</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

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
                        onClick={handleOpenSkinSelector}
                        style={{
                            width: '100%',
                            padding: '10px 12px',
                            backgroundColor: 'transparent',
                            color: '#3b82f6',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: '500',
                            textAlign: 'left',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'background-color 0.15s ease',
                            letterSpacing: '-0.01em',
                            marginBottom: '4px'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.15)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                    >
                        👔 Trang Phục
                    </button>
                    
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

            {/* Skin Selector Modal */}
            {showSkinSelector && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 10002,
                        padding: '20px'
                    }}
                    onClick={() => setShowSkinSelector(false)}
                >
                    <div
                        style={{
                            backgroundColor: '#1F2937',
                            borderRadius: '16px',
                            padding: '24px',
                            maxWidth: '500px',
                            width: '100%',
                            maxHeight: '80vh',
                            overflow: 'auto',
                            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
                            border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '20px'
                        }}>
                            <h3 style={{
                                color: '#F9FAFB',
                                fontSize: '20px',
                                fontWeight: 'bold',
                                margin: 0
                            }}>
                                👔 Chọn Trang Phục
                            </h3>
                            <button
                                onClick={() => setShowSkinSelector(false)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#9CA3AF',
                                    fontSize: '24px',
                                    cursor: 'pointer',
                                    padding: '0 8px'
                                }}
                            >
                                ×
                            </button>
                        </div>

                        {/* Loading */}
                        {loadingSkins && (
                            <div style={{
                                textAlign: 'center',
                                color: '#9CA3AF',
                                padding: '40px'
                            }}>
                                Đang tải...
                            </div>
                        )}

                        {/* Skins Grid */}
                        {!loadingSkins && skins.length > 0 && (
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                                gap: '12px'
                            }}>
                                {skins.map((skin) => (
                                    <div
                                        key={skin.id}
                                        onClick={() => !skin.equipped && !equippingSkin && handleEquipSkin(skin.id)}
                                        style={{
                                            backgroundColor: skin.equipped 
                                                ? 'rgba(16, 185, 129, 0.15)' 
                                                : 'rgba(255, 255, 255, 0.05)',
                                            border: `2px solid ${skin.equipped ? '#10B981' : 'rgba(255, 255, 255, 0.1)'}`,
                                            borderRadius: '12px',
                                            padding: '12px',
                                            cursor: skin.equipped || equippingSkin ? 'default' : 'pointer',
                                            transition: 'all 0.2s',
                                            position: 'relative'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!skin.equipped && !equippingSkin) {
                                                e.currentTarget.style.borderColor = '#3B82F6';
                                                e.currentTarget.style.transform = 'translateY(-2px)';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!skin.equipped) {
                                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                                                e.currentTarget.style.transform = 'translateY(0)';
                                            }
                                        }}
                                    >
                                        {/* Equipped Badge */}
                                        {skin.equipped && (
                                            <div style={{
                                                position: 'absolute',
                                                top: '8px',
                                                right: '8px',
                                                backgroundColor: '#10B981',
                                                color: '#fff',
                                                padding: '2px 6px',
                                                borderRadius: '4px',
                                                fontSize: '10px',
                                                fontWeight: 'bold'
                                            }}>
                                                ✓
                                            </div>
                                        )}

                                        {/* Skin Icon */}
                                        <div style={{
                                            width: '100%',
                                            height: '80px',
                                            backgroundColor: 'rgba(0, 0, 0, 0.3)',
                                            borderRadius: '8px',
                                            marginBottom: '8px',
                                            display: 'flex',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            fontSize: '36px'
                                        }}>
                                            {skin.id === 'knight' && '🛡️'}
                                            {skin.id === 'warrior' && '⚔️'}
                                            {skin.id === 'mage' && '🔮'}
                                            {skin.id === 'assassin' && '🗡️'}
                                            {skin.id === 'dragon_knight' && '🐉'}
                                        </div>

                                        {/* Skin Name */}
                                        <div style={{
                                            color: '#F9FAFB',
                                            fontSize: '13px',
                                            fontWeight: '600',
                                            textAlign: 'center',
                                            marginBottom: '4px'
                                        }}>
                                            {skin.name}
                                        </div>

                                        {/* Stats */}
                                        {skin.stats && formatSkinStats(skin.stats).length > 0 && (
                                            <div style={{
                                                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                                borderRadius: '4px',
                                                padding: '4px 6px',
                                                marginBottom: '4px'
                                            }}>
                                                {formatSkinStats(skin.stats).map((stat, idx) => (
                                                    <div key={idx} style={{
                                                        color: '#60A5FA',
                                                        fontSize: '9px',
                                                        textAlign: 'center',
                                                        marginBottom: idx < formatSkinStats(skin.stats!).length - 1 ? '1px' : '0'
                                                    }}>
                                                        {stat}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Status */}
                                        <div style={{
                                            color: skin.equipped ? '#10B981' : '#9CA3AF',
                                            fontSize: '11px',
                                            textAlign: 'center'
                                        }}>
                                            {skin.equipped ? 'Đang dùng' : 'Nhấn để trang bị'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Empty State */}
                        {!loadingSkins && skins.length === 0 && (
                            <div style={{
                                textAlign: 'center',
                                color: '#9CA3AF',
                                padding: '40px'
                            }}>
                                <div style={{ fontSize: '48px', marginBottom: '12px' }}>👔</div>
                                <div>Bạn chưa có trang phục nào</div>
                                <div style={{ fontSize: '12px', marginTop: '8px' }}>
                                    Hãy mua trang phục từ NPC Thợ May!
                                </div>
                            </div>
                        )} 
                    </div>
                </div>
            )}
        </>
    );
};

export default ProfileMenu;
