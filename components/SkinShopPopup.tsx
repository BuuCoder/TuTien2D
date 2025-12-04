'use client';

import { useState, useEffect } from 'react';
import { useGameStore } from '@/lib/store';
import { sendObfuscatedRequest } from '@/lib/requestObfuscator';
import { getRarityColor, formatSkinStats, SkinStats } from '@/lib/skinData';
import { calculatePlayerStats } from '@/lib/skinStatsHelper';
import ConfirmDialog from './ConfirmDialog';

interface SkinData {
    id: string;
    name: string;
    description: string;
    price: number;
    assetPath: string;
    rarity: string;
    isDefault: boolean;
    owned: boolean;
    equipped: boolean;
    stats?: SkinStats;
}

interface SkinShopPopupProps {
    onClose: () => void;
}

export default function SkinShopPopup({ onClose }: SkinShopPopupProps) {
    const user = useGameStore((state) => state.user);
    const setUser = useGameStore((state) => state.setUser);
    const [skins, setSkins] = useState<SkinData[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSkin, setSelectedSkin] = useState<SkinData | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean;
        skin: SkinData | null;
    }>({ isOpen: false, skin: null });

    useEffect(() => {
        loadSkins();
    }, []);

    const loadSkins = async () => {
        if (!user) return;
        
        try {
            const response = await sendObfuscatedRequest('/api/skin/list', {
                userId: user.id,
                sessionId: user.sessionId,
                token: user.socketToken
            });

            const data = await response.json();

            if (data.success) {
                setSkins(data.skins);
            }
        } catch (error) {
            console.error('Error loading skins:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleBuySkinClick = (skin: SkinData) => {
        if (actionLoading || !user) return;

        // Validation: Check if user already owns this skin
        if (skin.owned) {
            alert('Bạn đã sở hữu trang phục này rồi!');
            return;
        }

        // Validation: Check if user has enough gold
        const currentGold = user.gold || 0;
        if (currentGold < skin.price) {
            alert(`Không đủ vàng! Bạn cần ${skin.price.toLocaleString()} vàng nhưng chỉ có ${currentGold.toLocaleString()} vàng.`);
            return;
        }

        // Show confirm dialog
        setConfirmDialog({ isOpen: true, skin });
    };

    const handleConfirmBuy = async () => {
        const skin = confirmDialog.skin;
        if (!skin || !user) return;

        setConfirmDialog({ isOpen: false, skin: null });
        setActionLoading(true);
        try {
            const response = await sendObfuscatedRequest('/api/skin/buy', {
                userId: user.id,
                sessionId: user.sessionId,
                token: user.socketToken,
                skinId: skin.id
            });

            const data = await response.json();

            if (data.success) {
                // Update user gold
                setUser({ ...user, gold: data.gold });
                
                // Reload skins
                await loadSkins();
                
                alert(data.message);
            } else {
                alert(data.error || 'Không thể mua trang phục');
            }
        } catch (error: any) {
            alert(error.message || 'Lỗi khi mua trang phục');
        } finally {
            setActionLoading(false);
        }
    };

    const handleEquipSkin = async (skin: SkinData) => {
        if (actionLoading || !user) return;

        setActionLoading(true);
        try {
            const response = await sendObfuscatedRequest('/api/skin/equip', {
                userId: user.id,
                sessionId: user.sessionId,
                token: user.socketToken,
                skinId: skin.id
            });

            const data = await response.json();

            if (data.success) {
                // Update user skin
                setUser({ ...user, skin: skin.id });
                
                // Update player stats với skin bonus (attack đã có bonus)
                if (data.stats) {
                    const setPlayerStats = useGameStore.getState().setPlayerStats;
                    setPlayerStats({
                        maxHp: data.stats.maxHp,
                        currentHp: data.stats.hp,
                        maxMp: data.stats.maxMp,
                        mp: data.stats.mp,
                        attack: data.stats.attack,
                        defense: data.stats.defense
                    });
                    
                    console.log('[SkinEquip] Updated player stats:', data.stats);
                }
                
                // Reload skins
                await loadSkins();
                
                alert(data.message);
            } else {
                alert(data.error || 'Không thể trang bị');
            }
        } catch (error: any) {
            alert(error.message || 'Lỗi khi trang bị');
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 10000,
            padding: '20px'
        }}>
            <div style={{
                backgroundColor: '#1a1a2e',
                borderRadius: '16px',
                padding: '24px',
                maxWidth: '800px',
                width: '100%',
                maxHeight: '80vh',
                overflow: 'auto',
                border: '2px solid #FFD700',
                boxShadow: '0 8px 32px rgba(255, 215, 0, 0.3)'
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '20px'
                }}>
                    <h2 style={{
                        color: '#FFD700',
                        fontSize: '24px',
                        fontWeight: 'bold',
                        margin: 0
                    }}>
                        🎭 Cửa Hàng Trang Phục
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#fff',
                            fontSize: '24px',
                            cursor: 'pointer',
                            padding: '0 8px'
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* Gold Display */}
                <div style={{
                    backgroundColor: 'rgba(255, 215, 0, 0.1)',
                    padding: '12px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    textAlign: 'center'
                }}>
                    <span style={{
                        color: '#FFD700',
                        fontSize: '18px',
                        fontWeight: 'bold'
                    }}>
                        💰 Vàng: {(user?.gold || 0).toLocaleString()}
                    </span>
                </div>

                {/* Skins Grid */}
                {loading ? (
                    <div style={{ textAlign: 'center', color: '#fff', padding: '40px' }}>
                        Đang tải...
                    </div>
                ) : (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                        gap: '16px'
                    }}>
                        {skins.map((skin) => (
                            <div
                                key={skin.id}
                                onClick={() => setSelectedSkin(skin)}
                                style={{
                                    backgroundColor: selectedSkin?.id === skin.id 
                                        ? 'rgba(255, 215, 0, 0.2)' 
                                        : 'rgba(255, 255, 255, 0.05)',
                                    border: `2px solid ${selectedSkin?.id === skin.id 
                                        ? '#FFD700' 
                                        : getRarityColor(skin.rarity)}`,
                                    borderRadius: '12px',
                                    padding: '16px',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s',
                                    position: 'relative'
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
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        fontSize: '12px',
                                        fontWeight: 'bold'
                                    }}>
                                        ✓ Đang dùng
                                    </div>
                                )}

                                {/* Skin Preview */}
                                <div style={{
                                    width: '100%',
                                    height: '120px',
                                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                                    borderRadius: '8px',
                                    marginBottom: '12px',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    fontSize: '48px'
                                }}>
                                    {skin.id === 'knight' && '🛡️'}
                                    {skin.id === 'warrior' && '⚔️'}
                                    {skin.id === 'mage' && '🔮'}
                                    {skin.id === 'assassin' && '🗡️'}
                                    {skin.id === 'dragon_knight' && '🐉'}
                                </div>

                                {/* Skin Info */}
                                <h3 style={{
                                    color: getRarityColor(skin.rarity),
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    margin: '0 0 8px 0'
                                }}>
                                    {skin.name}
                                </h3>

                                <p style={{
                                    color: '#9CA3AF',
                                    fontSize: '12px',
                                    margin: '0 0 8px 0'
                                }}>
                                    {skin.description}
                                </p>

                                {/* Stats Bonus */}
                                {skin.stats && formatSkinStats(skin.stats).length > 0 && (
                                    <div style={{
                                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                        borderRadius: '6px',
                                        padding: '6px 8px',
                                        marginBottom: '8px'
                                    }}>
                                        {formatSkinStats(skin.stats).map((stat, idx) => (
                                            <div key={idx} style={{
                                                color: '#60A5FA',
                                                fontSize: '10px',
                                                marginBottom: idx < formatSkinStats(skin.stats!).length - 1 ? '2px' : '0'
                                            }}>
                                                {stat}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Price or Status */}
                                {skin.owned ? (
                                    skin.equipped ? (
                                        <div style={{
                                            backgroundColor: 'rgba(16, 185, 129, 0.2)',
                                            color: '#10B981',
                                            padding: '8px',
                                            borderRadius: '6px',
                                            textAlign: 'center',
                                            fontSize: '14px',
                                            fontWeight: 'bold'
                                        }}>
                                            Đang sử dụng
                                        </div>
                                    ) : (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleEquipSkin(skin);
                                            }}
                                            disabled={actionLoading}
                                            style={{
                                                width: '100%',
                                                backgroundColor: '#3B82F6',
                                                color: '#fff',
                                                border: 'none',
                                                padding: '8px',
                                                borderRadius: '6px',
                                                cursor: actionLoading ? 'not-allowed' : 'pointer',
                                                fontSize: '14px',
                                                fontWeight: 'bold',
                                                opacity: actionLoading ? 0.5 : 1
                                            }}
                                        >
                                            Trang bị
                                        </button>
                                    )
                                ) : (
                                    <>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleBuySkinClick(skin);
                                            }}
                                            disabled={actionLoading || skin.price > (user?.gold || 0)}
                                            title={skin.price > (user?.gold || 0) 
                                                ? `Không đủ vàng! Cần ${skin.price.toLocaleString()} vàng` 
                                                : `Mua ${skin.name}`}
                                            style={{
                                                width: '100%',
                                                backgroundColor: skin.price > (user?.gold || 0) 
                                                    ? '#6B7280' 
                                                    : '#10B981',
                                                color: '#fff',
                                                border: 'none',
                                                padding: '8px',
                                                borderRadius: '6px',
                                                cursor: (actionLoading || skin.price > (user?.gold || 0)) 
                                                    ? 'not-allowed' 
                                                    : 'pointer',
                                                fontSize: '14px',
                                                fontWeight: 'bold',
                                                opacity: (actionLoading || skin.price > (user?.gold || 0)) 
                                                    ? 0.5 
                                                    : 1
                                            }}
                                        >
                                            💰 {skin.price.toLocaleString()}
                                        </button>
                                        {skin.price > (user?.gold || 0) && (
                                            <div style={{
                                                marginTop: '4px',
                                                fontSize: '11px',
                                                color: '#EF4444',
                                                textAlign: 'center'
                                            }}>
                                                Thiếu {(skin.price - (user?.gold || 0)).toLocaleString()} vàng
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Close Button */}
                <button
                    onClick={onClose}
                    style={{
                        width: '100%',
                        marginTop: '20px',
                        padding: '12px',
                        backgroundColor: '#EF4444',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                    }}
                >
                    Đóng
                </button>
            </div>

            {/* Confirm Dialog */}
            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                title="Xác nhận mua trang phục"
                message={`Bạn có chắc muốn mua "${confirmDialog.skin?.name}" không?`}
                details={confirmDialog.skin ? [
                    `💰 Giá: ${confirmDialog.skin.price.toLocaleString()} vàng`,
                    `💵 Số vàng hiện tại: ${(user?.gold || 0).toLocaleString()}`,
                    `💸 Số vàng sau khi mua: ${((user?.gold || 0) - confirmDialog.skin.price).toLocaleString()}`
                ] : []}
                confirmText="Mua ngay"
                cancelText="Hủy"
                confirmColor="#10B981"
                onConfirm={handleConfirmBuy}
                onCancel={() => setConfirmDialog({ isOpen: false, skin: null })}
            />
        </div>
    );
}
