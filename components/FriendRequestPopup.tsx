'use client';

import React, { useState, useEffect } from 'react';
import { useGameStore } from '@/lib/store';

interface FriendRequest {
    requestId: string;
    fromUserId: number;
    fromUsername: string;
    timestamp: number;
}

const FriendRequestPopup = () => {
    const { socket } = useGameStore();
    const [requests, setRequests] = useState<FriendRequest[]>([]);

    useEffect(() => {
        if (!socket) return;

        const handleFriendRequest = (data: FriendRequest) => {
            setRequests(prev => [...prev, data]);

            // Tự động xóa sau 10 giây
            setTimeout(() => {
                setRequests(prev => prev.filter(r => r.requestId !== data.requestId));
            }, 10000);
        };

        const handleFriendRequestResponse = ({ success, message }: { success: boolean; message: string }) => {
            if (success) {
                useGameStore.getState().setNotification({
                    message,
                    type: 'success'
                });
            }
        };

        socket.on('friend_request', handleFriendRequest);
        socket.on('friend_request_response', handleFriendRequestResponse);

        return () => {
            socket.off('friend_request', handleFriendRequest);
            socket.off('friend_request_response', handleFriendRequestResponse);
        };
    }, [socket]);

    const handleAccept = (request: FriendRequest) => {
        if (!socket) return;

        socket.emit('friend_request_response', {
            requestId: request.requestId,
            fromUserId: request.fromUserId,
            accepted: true
        });

        setRequests(prev => prev.filter(r => r.requestId !== request.requestId));
    };

    const handleReject = (request: FriendRequest) => {
        if (!socket) return;

        socket.emit('friend_request_response', {
            requestId: request.requestId,
            fromUserId: request.fromUserId,
            accepted: false
        });

        setRequests(prev => prev.filter(r => r.requestId !== request.requestId));
    };

    if (requests.length === 0) return null;

    return (
        <div style={{
            position: 'fixed',
            top: '80px',
            right: '20px',
            zIndex: 10001,
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
        }}>
            {requests.map((request) => (
                <div
                    key={request.requestId}
                    style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.9)',
                        padding: '16px',
                        borderRadius: '12px',
                        minWidth: '280px',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                        border: '2px solid #667eea',
                        animation: 'slideIn 0.3s ease-out'
                    }}
                >
                    <div style={{
                        color: 'white',
                        fontSize: '14px',
                        marginBottom: '12px',
                        fontWeight: 'bold'
                    }}>
                        🤝 Lời mời kết bạn
                    </div>
                    <div style={{
                        color: '#aaa',
                        fontSize: '13px',
                        marginBottom: '16px'
                    }}>
                        <strong style={{ color: '#667eea' }}>{request.fromUsername}</strong> muốn kết bạn với bạn
                    </div>
                    <div style={{
                        display: 'flex',
                        gap: '8px'
                    }}>
                        <button
                            onClick={() => handleAccept(request)}
                            style={{
                                flex: 1,
                                padding: '8px',
                                backgroundColor: '#4CAF50',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: 'bold'
                            }}
                        >
                            ✓ Chấp nhận
                        </button>
                        <button
                            onClick={() => handleReject(request)}
                            style={{
                                flex: 1,
                                padding: '8px',
                                backgroundColor: '#f44336',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: 'bold'
                            }}
                        >
                            ✕ Từ chối
                        </button>
                    </div>
                    <div style={{
                        marginTop: '8px',
                        fontSize: '11px',
                        color: '#666',
                        textAlign: 'center'
                    }}>
                        Tự động hết hạn sau 10 giây
                    </div>
                </div>
            ))}
        </div>
    );
};

export default FriendRequestPopup;
