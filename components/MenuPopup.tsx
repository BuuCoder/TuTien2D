'use client';

import React, { useState } from 'react';
import { useGameStore } from '@/lib/store';

const MenuPopup = () => {
    const { activeMenu, setActiveMenu, setNotification } = useGameStore();
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    if (!activeMenu) return null;

    const handleBuyItem = async (item: any) => {
        try {
            // Determine action type based on category
            const actionType = selectedCategory === 'potions' ? 'BUY_POTION' :
                selectedCategory === 'quests' ? 'ACCEPT_QUEST' :
                    'BUY_ITEM';

            const requestBody: any = {
                actionType,
                itemId: item.id,
                itemName: item.name,
            };

            // Add appropriate fields based on action type
            if (actionType === 'ACCEPT_QUEST') {
                requestBody.questId = item.id;
                requestBody.questName = item.name;
            } else {
                requestBody.price = item.price;
                requestBody.category = selectedCategory;
            }

            const response = await fetch('/api/game-action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            });

            const data = await response.json();

            if (response.status === 429) {
                // Rate limit error
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
        } catch (error) {
            console.error('Action failed', error);
            setNotification({ message: 'Lỗi khi thực hiện!', type: 'error' });
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
                style={{
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(240, 240, 255, 0.95))',
                    backdropFilter: 'blur(20px)',
                    borderRadius: '24px',
                    padding: '32px',
                    maxWidth: '500px',
                    width: '90%',
                    maxHeight: '80vh',
                    overflow: 'auto',
                    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.5) inset',
                    position: 'relative',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
                <button
                    onClick={handleClose}
                    style={{
                        position: 'absolute',
                        top: '16px',
                        right: '16px',
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        border: 'none',
                        background: 'linear-gradient(135deg, rgba(244, 67, 54, 0.9), rgba(211, 47, 47, 0.9))',
                        color: 'white',
                        fontSize: '22px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold',
                        boxShadow: '0 4px 12px rgba(244, 67, 54, 0.4)',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.1)';
                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(244, 67, 54, 0.5)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(244, 67, 54, 0.4)';
                    }}
                >
                    ×
                </button>

                {!selectedCategory ? (
                    <>
                        <h2 style={{
                            margin: '0 0 24px 0',
                            color: '#2c3e50',
                            fontSize: '28px',
                            fontWeight: '700',
                            textAlign: 'center',
                            textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                        }}>
                            {activeMenu.menu.length > 0 ? 'Menu' : 'Nhiệm vụ'}
                        </h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {activeMenu.menu.length > 0 ? activeMenu.menu.map((category) => (
                                <button
                                    key={category.id}
                                    onClick={() => setSelectedCategory(category.id)}
                                    style={{
                                        padding: '18px 24px',
                                        background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.9), rgba(56, 142, 60, 0.9))',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '12px',
                                        fontSize: '18px',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease',
                                        boxShadow: '0 4px 15px rgba(76, 175, 80, 0.3)',
                                        position: 'relative',
                                        overflow: 'hidden',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(76, 175, 80, 0.4)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = '0 4px 15px rgba(76, 175, 80, 0.3)';
                                    }}
                                >
                                    {category.name}
                                </button>
                            )) : activeMenu.quests?.map((quest) => (
                                <div
                                    key={quest.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        justifyContent: 'space-between',
                                        padding: '20px',
                                        background: 'rgba(255, 255, 255, 0.6)',
                                        backdropFilter: 'blur(10px)',
                                        borderRadius: '12px',
                                        border: '1px solid rgba(255, 255, 255, 0.5)',
                                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                                        transition: 'all 0.2s',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateX(4px)';
                                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.15)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateX(0)';
                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                                    }}
                                >
                                    <div style={{ display: 'flex', gap: '14px', flex: 1 }}>
                                        <span style={{ fontSize: '36px' }}>{quest.image}</span>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: '600', color: '#2c3e50', fontSize: '16px', marginBottom: '6px' }}>
                                                {quest.name}
                                            </div>
                                            <div style={{ color: '#7f8c8d', fontSize: '13px', lineHeight: '1.5', marginBottom: '8px' }}>
                                                {quest.description}
                                            </div>
                                            <div style={{ color: '#f39c12', fontSize: '14px', fontWeight: '600' }}>
                                                🏆 Phần thưởng: {quest.reward} vàng
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleBuyItem({ ...quest, price: 0 })}
                                        style={{
                                            padding: '10px 20px',
                                            background: 'linear-gradient(135deg, rgba(255, 152, 0, 0.9), rgba(245, 124, 0, 0.9))',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            fontWeight: '600',
                                            fontSize: '14px',
                                            boxShadow: '0 4px 12px rgba(255, 152, 0, 0.3)',
                                            transition: 'all 0.2s',
                                            whiteSpace: 'nowrap',
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.transform = 'scale(1.05)';
                                            e.currentTarget.style.boxShadow = '0 6px 16px rgba(255, 152, 0, 0.4)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = 'scale(1)';
                                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 152, 0, 0.3)';
                                        }}
                                    >
                                        Nhận nhiệm vụ
                                    </button>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <>
                        <button
                            onClick={() => setSelectedCategory(null)}
                            style={{
                                marginBottom: '20px',
                                padding: '10px 18px',
                                background: 'rgba(0, 0, 0, 0.1)',
                                backdropFilter: 'blur(10px)',
                                border: '1px solid rgba(0, 0, 0, 0.1)',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: '600',
                                color: '#2c3e50',
                                transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(0, 0, 0, 0.15)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(0, 0, 0, 0.1)';
                            }}
                        >
                            ← Quay lại
                        </button>
                        <h2 style={{
                            margin: '0 0 24px 0',
                            color: '#2c3e50',
                            fontSize: '26px',
                            fontWeight: '700',
                            textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                        }}>
                            {selectedCategoryData?.name}
                        </h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {selectedCategoryData?.items.map((item) => (
                                <div
                                    key={item.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '16px',
                                        background: 'rgba(255, 255, 255, 0.6)',
                                        backdropFilter: 'blur(10px)',
                                        borderRadius: '12px',
                                        border: '1px solid rgba(255, 255, 255, 0.5)',
                                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                                        transition: 'all 0.2s',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateX(4px)';
                                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.15)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateX(0)';
                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                        <span style={{ fontSize: '36px' }}>{item.image}</span>
                                        <div>
                                            <div style={{ fontWeight: '600', color: '#2c3e50', fontSize: '16px' }}>
                                                {item.name}
                                            </div>
                                            <div style={{ color: '#7f8c8d', fontSize: '14px', marginTop: '4px' }}>
                                                {item.price > 0 ? `${item.price} vàng` : 'Miễn phí'}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleBuyItem(item)}
                                        style={{
                                            padding: '10px 20px',
                                            background: 'linear-gradient(135deg, rgba(33, 150, 243, 0.9), rgba(25, 118, 210, 0.9))',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            fontWeight: '600',
                                            fontSize: '14px',
                                            boxShadow: '0 4px 12px rgba(33, 150, 243, 0.3)',
                                            transition: 'all 0.2s',
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.transform = 'scale(1.05)';
                                            e.currentTarget.style.boxShadow = '0 6px 16px rgba(33, 150, 243, 0.4)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = 'scale(1)';
                                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(33, 150, 243, 0.3)';
                                        }}
                                    >
                                        {item.price > 0 ? 'Mua' : 'Nhận'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default MenuPopup;
