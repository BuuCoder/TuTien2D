'use client';

import { useEffect, useState } from 'react';
import { validateStoredToken, clearStoredData } from '@/lib/tokenValidator';

/**
 * Component hiển thị thông báo khi token hết hạn
 * CHỈ hiển thị khi:
 * 1. Có user trong localStorage (đã từng đăng nhập)
 * 2. Token không hợp lệ (expired hoặc invalid)
 * 3. Chưa có user trong store (chưa đăng nhập lại)
 */
const TokenExpiredNotice = () => {
    const [showNotice, setShowNotice] = useState(false);

    useEffect(() => {
        // Đợi một chút để store load xong
        const timer = setTimeout(() => {
            const userStr = localStorage.getItem('tutien2d_user');
            
            // Không có user trong localStorage → Không hiện notice
            if (!userStr) {
                
                return;
            }

            // Validate token (không auto-clear)
            const isValid = validateStoredToken(false);
            
            
            
            // Token invalid → Hiện notice
            if (!isValid) {
                
                setShowNotice(true);
            } else {
                
            }
        }, 1000); // Đợi 1s để store load xong

        return () => clearTimeout(timer);
    }, []);

    const handleClose = () => {
        clearStoredData();
        setShowNotice(false);
        window.location.reload();
    };

    if (!showNotice) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
        }}>
            <div style={{
                backgroundColor: 'white',
                padding: '30px',
                borderRadius: '12px',
                maxWidth: '400px',
                textAlign: 'center',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            }}>
                <div style={{ fontSize: '48px', marginBottom: '20px' }}>⚠️</div>
                <h2 style={{ 
                    color: '#333', 
                    marginBottom: '15px',
                    fontSize: '24px',
                }}>
                    Phiên Đăng Nhập Hết Hạn
                </h2>
                <p style={{ 
                    color: '#666', 
                    marginBottom: '25px',
                    lineHeight: '1.6',
                }}>
                    Token xác thực của bạn đã hết hạn hoặc không hợp lệ.
                    <br />
                    Vui lòng đăng nhập lại để tiếp tục chơi.
                </p>
                <button
                    onClick={handleClose}
                    style={{
                        padding: '12px 30px',
                        backgroundColor: '#667eea',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#5568d3';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#667eea';
                        e.currentTarget.style.transform = 'translateY(0)';
                    }}
                >
                    Đăng Nhập Lại
                </button>
            </div>
        </div>
    );
};

export default TokenExpiredNotice;
