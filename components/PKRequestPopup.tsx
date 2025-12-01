'use client';

import React, { useEffect, useState } from 'react';
import { useGameStore } from '@/lib/store';

const PKRequestPopup = () => {
    const { pkRequests, removePKRequest, socket, addPKSession } = useGameStore();
    const [timeLeft, setTimeLeft] = useState<Record<string, number>>({});

    // Update countdown timers
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            const newTimeLeft: Record<string, number> = {};
            
            pkRequests.forEach(request => {
                const remaining = Math.max(0, Math.ceil((request.expiresAt - now) / 1000));
                newTimeLeft[request.requestId] = remaining;
                
                // Auto-remove expired requests
                if (remaining === 0) {
                    removePKRequest(request.requestId);
                }
            });
            
            setTimeLeft(newTimeLeft);
        }, 100);

        return () => clearInterval(interval);
    }, [pkRequests, removePKRequest]);

    const handleAccept = (request: any) => {
        if (!socket) return;

        socket.emit('pk_request_response', {
            requestId: request.requestId,
            fromSocketId: request.fromSocketId,
            accepted: true
        });

        addPKSession(request.fromSocketId);
        removePKRequest(request.requestId);

        // Hồi phục HP/Mana khi chấp nhận PK
        const state = useGameStore.getState();
        state.setPlayerStats({
            currentHp: state.playerStats.maxHp,
            currentMana: state.playerStats.maxMana
        });

        socket.emit('update_hp', {
            hp: state.playerStats.maxHp,
            maxHp: state.playerStats.maxHp
        });

        useGameStore.getState().setNotification({
            message: `Đã chấp nhận PK với ${request.fromUsername}! 💚 HP đã hồi phục!`,
            type: 'success'
        });
    };

    const handleDecline = (request: any) => {
        if (!socket) return;

        socket.emit('pk_request_response', {
            requestId: request.requestId,
            fromSocketId: request.fromSocketId,
            accepted: false
        });

        removePKRequest(request.requestId);

        useGameStore.getState().setNotification({
            message: `Đã từ chối PK với ${request.fromUsername}`,
            type: 'info'
        });
    };

    if (pkRequests.length === 0) return null;

    return (
        <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 10002,
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
        }}>
            {pkRequests.map(request => (
                <div
                    key={request.requestId}
                    style={{
                        backgroundColor: 'rgba(0,0,0,0.9)',
                        padding: '20px',
                        borderRadius: '12px',
                        border: '2px solid #e74c3c',
                        minWidth: '280px',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                        animation: 'slideIn 0.3s ease-out',
                    }}
                >
                    <style jsx>{`
                        @keyframes slideIn {
                            from {
                                opacity: 0;
                                transform: translateY(-20px);
                            }
                            to {
                                opacity: 1;
                                transform: translateY(0);
                            }
                        }
                    `}</style>

                    <div style={{
                        fontSize: '18px',
                        fontWeight: 'bold',
                        color: 'white',
                        marginBottom: '10px',
                        textAlign: 'center',
                    }}>
                        ⚔️ Lời Mời PK
                    </div>

                    <div style={{
                        fontSize: '14px',
                        color: '#ecf0f1',
                        marginBottom: '15px',
                        textAlign: 'center',
                    }}>
                        <span style={{ color: '#e74c3c', fontWeight: 'bold' }}>
                            {request.fromUsername}
                        </span>
                        {' '}muốn thách đấu với bạn!
                    </div>

                    <div style={{
                        fontSize: '12px',
                        color: '#95a5a6',
                        marginBottom: '15px',
                        textAlign: 'center',
                    }}>
                        Hết hạn sau: <span style={{ color: '#e74c3c', fontWeight: 'bold' }}>
                            {timeLeft[request.requestId] || 0}s
                        </span>
                    </div>

                    <div style={{
                        display: 'flex',
                        gap: '10px',
                    }}>
                        <button
                            onClick={() => handleAccept(request)}
                            style={{
                                flex: 1,
                                padding: '10px',
                                backgroundColor: '#27ae60',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                fontSize: '14px',
                                transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#2ecc71';
                                e.currentTarget.style.transform = 'scale(1.05)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#27ae60';
                                e.currentTarget.style.transform = 'scale(1)';
                            }}
                        >
                            ✓ Chấp nhận
                        </button>

                        <button
                            onClick={() => handleDecline(request)}
                            style={{
                                flex: 1,
                                padding: '10px',
                                backgroundColor: '#c0392b',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                fontSize: '14px',
                                transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#e74c3c';
                                e.currentTarget.style.transform = 'scale(1.05)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#c0392b';
                                e.currentTarget.style.transform = 'scale(1)';
                            }}
                        >
                            ✕ Từ chối
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default PKRequestPopup;
