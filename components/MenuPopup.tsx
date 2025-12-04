'use client';

import React, { useState, useEffect } from 'react';
import { useGameStore } from '@/lib/store';
import { sendObfuscatedRequest } from '@/lib/requestObfuscator';
import ConfirmDialog from './ConfirmDialog';

const MenuPopup = () => {
    const { activeMenu, setActiveMenu, setNotification, user, setPlayerStats, playerStats } = useGameStore();
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [ownedSkins, setOwnedSkins] = useState<Set<string>>(new Set());
    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean;
        item: any;
        skinId: string;
    }>({ isOpen: false, item: null, skinId: '' });

    // Load owned skins when menu opens with skin category
    useEffect(() => {
        const loadOwnedSkins = async () => {
            if (!user || !activeMenu) return;
            
            // Check if menu has skin category
            const hasSkinCategory = activeMenu.menu?.some(cat => cat.id === 'skins');
            if (!hasSkinCategory) return;

            try {
                const response = await sendObfuscatedRequest('/api/skin/list', {
                    userId: user.id,
                    sessionId: user.sessionId,
                    token: user.socketToken
                });

                if (response.success) {
                    const owned = new Set(
                        response.skins
                            .filter((s: any) => s.owned)
                            .map((s: any) => s.id)
                    );
                    setOwnedSkins(owned);
                }
            } catch (error) {
                console.error('Error loading owned skins:', error);
            }
        };

        loadOwnedSkins();
    }, [activeMenu, user]);

    // Early return AFTER all hooks
    if (!activeMenu) return null;

    const handleBuyItem = async (item: any) => {
        try {
            if (!user) {
                setNotification({ message: 'Bạn chưa đăng nhập!', type: 'error' });
                return;
            }

            // Kiểm tra nếu là skin
            const isSkin = item.id.startsWith('skin-');
            
            if (isSkin) {
                // Extract skin ID (remove 'skin-' prefix)
                const skinId = item.id.replace('skin-', '');
                
                // Validation: Check if user already owns this skin
                if (ownedSkins.has(skinId)) {
                    setNotification({
                        message: 'Bạn đã sở hữu trang phục này rồi!',
                        type: 'error'
                    });
                    return;
                }
                
                // Validation: Check if user has enough gold
                const currentGold = user.gold || 0;
                if (currentGold < item.price) {
                    setNotification({
                        message: `Không đủ vàng! Cần ${item.price.toLocaleString()} vàng nhưng chỉ có ${currentGold.toLocaleString()} vàng.`,
                        type: 'error'
                    });
                    return;
                }

                // Show confirm dialog
                setConfirmDialog({ isOpen: true, item, skinId });
                return;
            }

            // Kiểm tra nếu là dịch vụ healing
            const isHealingService = item.id === 'heal-hp' || item.id === 'heal-mp' || item.id === 'heal-all';

            if (isHealingService) {
                // Gọi API buy-item cho dịch vụ healing
                const response = await sendObfuscatedRequest('/api/buy-item', {
                    itemId: item.id,
                    itemName: item.name,
                    price: item.price,
                    userId: user.id,
                    sessionId: user.sessionId,
                    token: user.socketToken,
                    npcId: activeMenu.npcId
                });

                const data = await response.json();

                if (data.success) {
                    // Cập nhật HP/MP từ response
                    if (data.hp !== undefined && data.mp !== undefined) {
                        setPlayerStats({
                            currentHp: data.hp,
                            maxHp: data.maxHp,
                            mp: data.mp,
                            maxMp: data.maxMp
                        });
                    }

                    // Cập nhật gold
                    if (data.gold !== undefined) {
                        useGameStore.setState({ 
                            user: { ...user, gold: data.gold } 
                        });
                    }

                    setNotification({ message: data.message, type: 'success' });
                } else {
                    setNotification({
                        message: data.error || 'Không thể mua dịch vụ!',
                        type: 'error'
                    });
                }
            } else {
                // Mua item thông thường (quest, potion, etc.)
                const actionType = selectedCategory === 'quests' ? 'ACCEPT_QUEST' : 'BUY_ITEM';

                const requestBody: any = {
                    actionType,
                    itemId: item.id,
                    itemName: item.name,
                    userId: user.id,
                    sessionId: user.sessionId,
                    token: user.socketToken
                };

                if (actionType === 'ACCEPT_QUEST') {
                    requestBody.questId = item.id;
                    requestBody.questName = item.name;
                } else {
                    requestBody.price = item.price;
                    requestBody.category = selectedCategory;
                }

                const response = await sendObfuscatedRequest('/api/game-action', requestBody);

                const data = await response.json();

                if (response.status === 429) {
                    setNotification({
                        message: 'Vui lòng đợi request trước hoàn thành!',
                        type: 'error'
                    });
                    return;
                }

                if (data.success) {
                    setNotification({ message: data.message, type: 'success' });
                } else {
                    setNotification({
                        message: data.error || 'Thao tác thất bại!',
                        type: 'error'
                    });
                }
            }
        } catch (error) {
            console.error('Action failed', error);
            setNotification({ message: 'Lỗi khi thực hiện!', type: 'error' });
        }
    };

    const handleConfirmBuySkin = async () => {
        const { item, skinId } = confirmDialog;
        if (!item || !user) return;

        setConfirmDialog({ isOpen: false, item: null, skinId: '' });

        try {
            const response = await sendObfuscatedRequest('/api/skin/buy', {
                userId: user.id,
                sessionId: user.sessionId,
                token: user.socketToken,
                skinId: skinId
            });

            const data = await response.json();

            if (data.success) {
                // Update user gold
                useGameStore.setState({ 
                    user: { ...user, gold: data.gold } 
                });
                
                // Reload owned skins
                setOwnedSkins(prev => new Set([...prev, skinId]));
                
                setNotification({ message: data.message, type: 'success' });
            } else {
                setNotification({
                    message: data.error || 'Không thể mua trang phục!',
                    type: 'error'
                });
            }
        } catch (error: any) {
            setNotification({
                message: error.message || 'Lỗi khi mua trang phục!',
                type: 'error'
            });
        }
    };

    const handleClose = () => {
        setActiveMenu(null);
        setSelectedCategory(null);
    };

    const selectedCategoryData = activeMenu.menu.find(cat => cat.id === selectedCategory);

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10001,
                animation: 'fadeIn 0.2s ease-out',
            }}
            onClick={handleClose}
        >
            <div
                className="menu-popup-content"
                style={{
                    backgroundColor: 'rgba(17, 17, 17, 0.98)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: '12px',
                    padding: '0',
                    maxWidth: '480px',
                    width: '90%',
                    maxHeight: '80vh',
                    overflow: 'hidden',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
                    position: 'relative',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <style>{`
                    /* Mobile portrait */
                    @media (max-width: 600px) {
                        .menu-popup-content {
                            padding: 18px !important;
                            max-height: 85vh !important;
                            max-width: 95% !important;
                        }
                        .menu-title {
                            font-size: 20px !important;
                            margin-bottom: 14px !important;
                        }
                        .menu-popup-content button {
                            padding: 10px 16px !important;
                            font-size: 14px !important;
                        }
                        .menu-item {
                            padding: 10px !important;
                        }
                        .menu-item-icon {
                            font-size: 26px !important;
                        }
                        .menu-item-text {
                            font-size: 13px !important;
                        }
                        .menu-item-price {
                            font-size: 12px !important;
                        }
                    }

                    /* Mobile landscape - more compact */
                    @media (max-height: 500px) and (orientation: landscape) {
                        .menu-popup-content {
                            padding: 10px !important;
                            max-height: 95vh !important;
                            max-width: 65% !important;
                            border-radius: 8px !important;
                        }
                        .menu-title {
                            font-size: 13px !important;
                            margin-bottom: 4px !important;
                        }
                        .menu-popup-content h2 {
                            font-size: 13px !important;
                            margin-bottom: 4px !important;
                        }
                        .menu-popup-content button {
                            padding: 5px 10px !important;
                            font-size: 11px !important;
                        }
                        .menu-item {
                            padding: 6px !important;
                            gap: 6px !important;
                        }
                        .quest-icon,
                        .item-icon {
                            font-size: 20px !important;
                        }
                        .menu-item-text {
                            font-size: 11px !important;
                            line-height: 1.2 !important;
                            margin-bottom: 2px !important;
                        }
                        .menu-item-price {
                            font-size: 10px !important;
                            margin-top: 0px !important;
                        }
                        .menu-item-description {
                            display: none !important;
                        }
                        .close-button {
                            width: 24px !important;
                            height: 24px !important;
                            font-size: 16px !important;
                            top: 6px !important;
                            right: 6px !important;
                        }
                        .back-button {
                            padding: 5px 10px !important;
                            font-size: 11px !important;
                            margin-bottom: 6px !important;
                        }
                    }

                    /* Very small landscape screens */
                    @media (max-height: 400px) and (orientation: landscape) {
                        .menu-popup-content {
                            padding: 6px !important;
                            max-height: 98vh !important;
                        }
                        .menu-title {
                            font-size: 12px !important;
                            margin-bottom: 3px !important;
                        }
                        .menu-popup-content h2 {
                            font-size: 12px !important;
                            margin-bottom: 3px !important;
                        }
                        .menu-popup-content button {
                            padding: 4px 8px !important;
                            font-size: 10px !important;
                        }
                        .menu-item {
                            padding: 4px !important;
                        }
                        .quest-icon,
                        .item-icon {
                            font-size: 16px !important;
                        }
                        .menu-item-text {
                            font-size: 10px !important;
                        }
                        .menu-item-price {
                            font-size: 9px !important;
                        }
                        .close-button {
                            width: 20px !important;
                            height: 20px !important;
                            font-size: 14px !important;
                        }
                    }
                `}</style>
                {/* Header */}
                <div style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: 'rgba(0, 0, 0, 0.2)',
                }}>
                    <h2 className="menu-title" style={{
                        margin: 0,
                        color: '#f9fafb',
                        fontSize: '18px',
                        fontWeight: '600',
                        letterSpacing: '-0.02em',
                    }}>
                        {!selectedCategory 
                            ? (activeMenu.menu.length > 0 ? 'Menu' : 'Nhiệm vụ')
                            : selectedCategoryData?.name
                        }
                    </h2>
                    <button
                        onClick={handleClose}
                        className="close-button"
                        style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '6px',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            background: 'rgba(239, 68, 68, 0.15)',
                            color: '#ef4444',
                            fontSize: '18px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: '600',
                            transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                        }}
                    >
                        ×
                    </button>
                </div>

                {/* Content */}
                <div style={{
                    flex: 1,
                    overflow: 'auto',
                    padding: '20px',
                }}>
                {!selectedCategory ? (
                    <>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {activeMenu.menu.length > 0 ? activeMenu.menu.map((category) => (
                                <button
                                    key={category.id}
                                    onClick={() => setSelectedCategory(category.id)}
                                    style={{
                                        padding: '12px 16px',
                                        background: 'rgba(255, 255, 255, 0.04)',
                                        color: '#f9fafb',
                                        border: '1px solid rgba(255, 255, 255, 0.08)',
                                        borderRadius: '6px',
                                        fontSize: '14px',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease',
                                        letterSpacing: '-0.01em',
                                        textAlign: 'left',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                                        e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                                    }}
                                >
                                    <span>{category.name}</span>
                                    <span style={{ color: '#9ca3af', fontSize: '16px' }}>›</span>
                                </button>
                            )) : activeMenu.quests?.map((quest) => (
                                <div
                                    key={quest.id}
                                    className="menu-item"
                                    style={{
                                        padding: '14px',
                                        background: 'rgba(255, 255, 255, 0.04)',
                                        borderRadius: '8px',
                                        border: '1px solid rgba(255, 255, 255, 0.08)',
                                        transition: 'all 0.15s ease',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                                        e.currentTarget.style.borderColor = 'rgba(251, 146, 60, 0.3)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                                    }}
                                >
                                    <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                                        <span className="menu-item-icon quest-icon" style={{ fontSize: '36px', flexShrink: 0 }}>{quest.image}</span>
                                        <div style={{ flex: 1 }}>
                                            <div className="menu-item-text" style={{ fontWeight: '600', color: '#f9fafb', fontSize: '15px', marginBottom: '4px', letterSpacing: '-0.01em' }}>
                                                {quest.name}
                                            </div>
                                            <div className="menu-item-text menu-item-description" style={{ color: '#9ca3af', fontSize: '12px', lineHeight: '1.5' }}>
                                                {quest.description}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div className="menu-item-price" style={{ color: '#fbbf24', fontSize: '13px', fontWeight: '600', letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <span style={{ fontSize: '14px' }}>🏆</span>
                                            {quest.reward} vàng
                                        </div>
                                        <button
                                            onClick={() => handleBuyItem({ ...quest, price: 0 })}
                                            style={{
                                                padding: '8px 14px',
                                                background: 'linear-gradient(135deg, rgba(251, 146, 60, 0.2) 0%, rgba(249, 115, 22, 0.2) 100%)',
                                                color: '#fb923c',
                                                border: '1px solid rgba(251, 146, 60, 0.3)',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                fontWeight: '600',
                                                fontSize: '12px',
                                                transition: 'all 0.15s ease',
                                                letterSpacing: '-0.01em'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(251, 146, 60, 0.3) 0%, rgba(249, 115, 22, 0.3) 100%)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(251, 146, 60, 0.2) 0%, rgba(249, 115, 22, 0.2) 100%)';
                                            }}
                                        >
                                            Nhận
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <>
                        <button
                            onClick={() => setSelectedCategory(null)}
                            className="back-button"
                            style={{
                                marginBottom: '12px',
                                padding: '8px 12px',
                                background: 'rgba(255, 255, 255, 0.04)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: '600',
                                color: '#9ca3af',
                                transition: 'all 0.15s ease',
                                letterSpacing: '-0.01em',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                                e.currentTarget.style.color = '#f9fafb';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                                e.currentTarget.style.color = '#9ca3af';
                            }}
                        >
                            <span style={{ fontSize: '14px' }}>←</span>
                            Quay lại
                        </button>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {selectedCategoryData?.items.map((item) => {
                                const isSkin = item.id.startsWith('skin-');
                                const skinId = isSkin ? item.id.replace('skin-', '') : '';
                                const isOwned = isSkin && ownedSkins.has(skinId);
                                const canAfford = (user?.gold || 0) >= item.price;
                                const isDisabled = isOwned || !canAfford;

                                return (
                                    <div
                                        key={item.id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '12px',
                                            background: 'rgba(255, 255, 255, 0.04)',
                                            borderRadius: '8px',
                                            border: '1px solid rgba(255, 255, 255, 0.08)',
                                            transition: 'all 0.15s ease',
                                            gap: '12px',
                                            opacity: isOwned ? 0.6 : 1
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!isOwned) {
                                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                                                e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                                            <span className="menu-item-icon item-icon" style={{ fontSize: '28px', flexShrink: 0 }}>{item.image}</span>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontWeight: '600', color: '#f9fafb', fontSize: '14px', letterSpacing: '-0.01em', marginBottom: '2px' }}>
                                                    {item.name}
                                                    {isOwned && <span style={{ marginLeft: '6px', color: '#10B981', fontSize: '12px' }}>✓ Đã sở hữu</span>}
                                                </div>
                                                <div style={{ color: !canAfford && !isOwned ? '#EF4444' : '#fbbf24', fontSize: '12px', fontWeight: '600', letterSpacing: '-0.01em' }}>
                                                    {item.price > 0 ? `💰 ${item.price.toLocaleString()}` : '🎁 Miễn phí'}
                                                    {!canAfford && !isOwned && <span style={{ marginLeft: '6px' }}>(Thiếu {(item.price - (user?.gold || 0)).toLocaleString()})</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleBuyItem(item)}
                                            disabled={isDisabled}
                                            title={isOwned ? 'Đã sở hữu' : !canAfford ? 'Không đủ vàng' : ''}
                                            style={{
                                                padding: '8px 14px',
                                                background: isDisabled 
                                                    ? 'rgba(107, 114, 128, 0.2)' 
                                                    : 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(37, 99, 235, 0.2) 100%)',
                                                color: isDisabled ? '#9CA3AF' : '#60a5fa',
                                                border: `1px solid ${isDisabled ? 'rgba(107, 114, 128, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`,
                                                borderRadius: '6px',
                                                cursor: isDisabled ? 'not-allowed' : 'pointer',
                                                fontWeight: '600',
                                                fontSize: '12px',
                                                transition: 'all 0.15s ease',
                                                letterSpacing: '-0.01em',
                                                flexShrink: 0,
                                                whiteSpace: 'nowrap',
                                                opacity: isDisabled ? 0.5 : 1
                                            }}
                                            onMouseEnter={(e) => {
                                                if (!isDisabled) {
                                                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(37, 99, 235, 0.3) 100%)';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (!isDisabled) {
                                                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(37, 99, 235, 0.2) 100%)';
                                                }
                                            }}
                                        >
                                            {isOwned ? 'Đã có' : item.price > 0 ? 'Mua' : 'Nhận'}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
                </div>
            </div>

            {/* Confirm Dialog */}
            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                title="Xác nhận mua trang phục"
                message={`Bạn có chắc muốn mua "${confirmDialog.item?.name}" không?`}
                details={confirmDialog.item && user ? [
                    `💰 Giá: ${confirmDialog.item.price.toLocaleString()} vàng`,
                    `💵 Số vàng hiện tại: ${(user.gold || 0).toLocaleString()}`,
                    `💸 Số vàng sau khi mua: ${((user.gold || 0) - confirmDialog.item.price).toLocaleString()}`
                ] : []}
                confirmText="Mua ngay"
                cancelText="Hủy"
                confirmColor="#10B981"
                onConfirm={handleConfirmBuySkin}
                onCancel={() => setConfirmDialog({ isOpen: false, item: null, skinId: '' })}
            />
        </div>
    );
};

export default MenuPopup;
