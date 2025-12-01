'use client';

import React, { useEffect } from 'react';
import { useGameStore } from '@/lib/store';

const NotificationPopup = () => {
    const { notification, setNotification } = useGameStore();

    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => {
                setNotification(null);
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, [notification, setNotification]);

    if (!notification) return null;

    const bgColors = {
        success: 'linear-gradient(135deg, rgba(76, 175, 80, 0.95), rgba(56, 142, 60, 0.95))',
        error: 'linear-gradient(135deg, rgba(244, 67, 54, 0.95), rgba(211, 47, 47, 0.95))',
        info: 'linear-gradient(135deg, rgba(33, 150, 243, 0.95), rgba(25, 118, 210, 0.95))',
    };

    const icons = {
        success: '✓',
        error: '✕',
        info: 'ℹ',
    };

    return (
        <div
            style={{
                position: 'fixed',
                top: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 10002,
                animation: 'slideDown 0.3s ease-out',
                minWidth: '300px',
                maxWidth: '90%',
            }}
        >
            <div
                style={{
                    background: bgColors[notification.type],
                    backdropFilter: 'blur(10px)',
                    borderRadius: '12px',
                    padding: '16px 20px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    color: 'white',
                    fontFamily: 'sans-serif',
                }}
            >
                <div
                    style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(255, 255, 255, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px',
                        fontWeight: 'bold',
                        flexShrink: 0,
                    }}
                >
                    {icons[notification.type]}
                </div>
                <div style={{ flex: 1, fontSize: '15px', fontWeight: '500' }}>
                    {notification.message}
                </div>
                <button
                    onClick={() => setNotification(null)}
                    style={{
                        background: 'rgba(255, 255, 255, 0.2)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                    }}
                >
                    ×
                </button>
            </div>
        </div>
    );
};

export default NotificationPopup;
