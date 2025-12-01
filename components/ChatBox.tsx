'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '@/lib/store';

interface ChatMessage {
    id: string;
    userId: number;
    username: string;
    message: string;
    timestamp: number;
}

const ChatBox = () => {
    const { socket, currentChannel, user, chatMessages, addChatMessage } = useGameStore();
    const [inputMessage, setInputMessage] = useState('');
    const [isOpen, setIsOpen] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!socket) return;

        socket.on('chat_message', (data: ChatMessage) => {
            addChatMessage(data);
        });

        socket.on('chat_history', (history: ChatMessage[]) => {
            history.forEach(msg => addChatMessage(msg));
        });

        return () => {
            socket.off('chat_message');
            socket.off('chat_history');
        };
    }, [socket, addChatMessage]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    const handleSend = () => {
        if (!inputMessage.trim() || !socket || !user) return;

        socket.emit('send_chat', {
            message: inputMessage,
            channelId: currentChannel
        });

        setInputMessage('');
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                style={{
                    position: 'fixed',
                    bottom: '20px',
                    left: '20px',
                    padding: '12px 20px',
                    backgroundColor: '#667eea',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    zIndex: 9999,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                }}
            >
                💬 Chat
            </button>
        );
    }

    return (
        <div style={{
            position: 'fixed',
            bottom: '20px',
            left: '20px',
            width: '350px',
            height: '450px',
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 9999,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            border: '1px solid rgba(255,255,255,0.1)'
        }}>
            {/* Header */}
            <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: 'rgba(102, 126, 234, 0.2)'
            }}>
                <div style={{ color: 'white', fontWeight: 'bold', fontSize: '14px' }}>
                    💬 Chat - Kênh {currentChannel || '?'}
                </div>
                <button
                    onClick={() => setIsOpen(false)}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '18px',
                        padding: '0 4px'
                    }}
                >
                    ✕
                </button>
            </div>

            {/* Messages */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
            }}>
                {chatMessages.map((msg, idx) => (
                    <div
                        key={idx}
                        style={{
                            padding: '8px 12px',
                            backgroundColor: msg.userId === user?.id
                                ? 'rgba(102, 126, 234, 0.3)'
                                : 'rgba(255, 255, 255, 0.05)',
                            borderRadius: '8px',
                            borderLeft: msg.userId === user?.id
                                ? '3px solid #667eea'
                                : '3px solid #555'
                        }}
                    >
                        <div style={{
                            fontSize: '11px',
                            color: '#aaa',
                            marginBottom: '4px',
                            fontWeight: 'bold'
                        }}>
                            {msg.username}
                        </div>
                        <div style={{
                            fontSize: '13px',
                            color: 'white',
                            wordWrap: 'break-word'
                        }}>
                            {msg.message}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div style={{
                padding: '12px',
                borderTop: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                gap: '8px'
            }}>
                <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Nhập tin nhắn..."
                    maxLength={200}
                    style={{
                        flex: 1,
                        padding: '8px 12px',
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '6px',
                        color: 'white',
                        fontSize: '13px',
                        outline: 'none'
                    }}
                />
                <button
                    onClick={handleSend}
                    disabled={!inputMessage.trim()}
                    style={{
                        padding: '8px 16px',
                        backgroundColor: inputMessage.trim() ? '#667eea' : '#555',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: inputMessage.trim() ? 'pointer' : 'not-allowed',
                        fontSize: '13px',
                        fontWeight: 'bold'
                    }}
                >
                    Gửi
                </button>
            </div>
        </div>
    );
};

export default ChatBox;
