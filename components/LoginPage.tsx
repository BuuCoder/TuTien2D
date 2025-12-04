'use client';

import React, { useState } from 'react';
import { useGameStore } from '@/lib/store';
import { sendObfuscatedRequest } from '@/lib/requestObfuscator';

const LoginPage = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const { setUser, setNotification } = useGameStore();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await sendObfuscatedRequest('/api/auth/login', { username, password });

            const data = await response.json();

            if (data.success) {
                // Lưu thông tin user vào store (bao gồm socketToken và skin)
                setUser({
                    id: data.user.id,
                    username: data.user.username,
                    sessionId: data.sessionId,
                    socketToken: data.socketToken, // Token mã hóa cho socket
                    gold: data.inventory.gold,
                    level: data.stats.level,
                    skin: data.user.skin || 'knight'
                });

                // Lưu HP/MP từ database
                const { setPlayerStats } = useGameStore.getState();
                setPlayerStats({
                    currentHp: data.stats.hp,
                    maxHp: data.stats.max_hp,
                    mp: data.stats.mp,
                    maxMp: data.stats.max_mp,
                });

                setNotification({ message: 'Đăng nhập thành công!', type: 'success' });
            } else {
                setError(data.error || 'Đăng nhập thất bại');
            }
        } catch (err) {
            setError('Lỗi kết nối server');
            console.error('Login error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{
            width: '100vw',
            height: '100vh',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            fontFamily: 'sans-serif',
            padding: '10px',
            boxSizing: 'border-box',
            overflow: 'auto'
        }}>
            <style>{`
                @media (max-width: 768px) {
                    .login-container {
                        padding: 25px !important;
                        width: 100% !important;
                        max-width: 400px !important;
                    }
                    .login-title {
                        font-size: 24px !important;
                        margin-bottom: 20px !important;
                    }
                    .login-input {
                        padding: 10px !important;
                        font-size: 14px !important;
                    }
                    .login-button {
                        padding: 12px !important;
                        font-size: 14px !important;
                    }
                    .demo-info {
                        font-size: 12px !important;
                    }
                }
                
                @media (max-width: 480px) {
                    .login-container {
                        padding: 20px !important;
                    }
                    .login-title {
                        font-size: 20px !important;
                        margin-bottom: 15px !important;
                    }
                }
                
                /* Mobile landscape (nằm ngang) */
                @media (max-height: 500px) and (orientation: landscape) {
                    .login-container {
                        padding: 15px !important;
                        max-height: 90vh !important;
                        overflow-y: auto !important;
                    }
                    .login-title {
                        font-size: 20px !important;
                        margin-bottom: 10px !important;
                    }
                    .login-input {
                        padding: 8px !important;
                    }
                    .login-button {
                        padding: 10px !important;
                    }
                    .demo-info {
                        margin-top: 10px !important;
                        font-size: 11px !important;
                    }
                    .form-group {
                        margin-bottom: 12px !important;
                    }
                }
            `}</style>
            <div className="login-container" style={{
                background: 'rgba(255, 255, 255, 0.95)',
                padding: '40px',
                borderRadius: '20px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                width: '400px',
                maxWidth: '90%',
                boxSizing: 'border-box'
            }}>
                <h1 className="login-title" style={{
                    textAlign: 'center',
                    color: '#333',
                    marginBottom: '30px',
                    fontSize: '32px',
                    fontWeight: 'bold'
                }}>
                    Tu Tiên 2D
                </h1>

                <form onSubmit={handleLogin}>
                    <div className="form-group" style={{ marginBottom: '20px' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '8px',
                            color: '#555',
                            fontWeight: '600'
                        }}>
                            Tên đăng nhập
                        </label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            className="login-input"
                            style={{
                                width: '100%',
                                padding: '12px',
                                border: '2px solid #ddd',
                                borderRadius: '8px',
                                fontSize: '16px',
                                outline: 'none',
                                transition: 'border 0.3s',
                                boxSizing: 'border-box'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#667eea'}
                            onBlur={(e) => e.target.style.borderColor = '#ddd'}
                        />
                    </div>

                    <div className="form-group" style={{ marginBottom: '25px' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '8px',
                            color: '#555',
                            fontWeight: '600'
                        }}>
                            Mật khẩu
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="login-input"
                            style={{
                                width: '100%',
                                padding: '12px',
                                border: '2px solid #ddd',
                                borderRadius: '8px',
                                fontSize: '16px',
                                outline: 'none',
                                transition: 'border 0.3s',
                                boxSizing: 'border-box'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#667eea'}
                            onBlur={(e) => e.target.style.borderColor = '#ddd'}
                        />
                    </div>

                    {error && (
                        <div style={{
                            padding: '12px',
                            backgroundColor: '#fee',
                            color: '#c33',
                            borderRadius: '8px',
                            marginBottom: '20px',
                            fontSize: '14px',
                            textAlign: 'center'
                        }}>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="login-button"
                        style={{
                            width: '100%',
                            padding: '14px',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            opacity: isLoading ? 0.7 : 1,
                            transition: 'transform 0.2s, opacity 0.2s',
                            boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
                            boxSizing: 'border-box'
                        }}
                        onMouseEnter={(e) => !isLoading && (e.currentTarget.style.transform = 'translateY(-2px)')}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                    </button>
                </form>

                <div className="demo-info" style={{
                    marginTop: '20px',
                    textAlign: 'center',
                    color: '#666',
                    fontSize: '14px'
                }}>
                    <p>Tài khoản demo:</p>
                    <p style={{ marginTop: '5px' }}>
                        <strong>player1</strong> / <strong>player2</strong>
                        <br />
                        Mật khẩu: <strong>123456</strong>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
