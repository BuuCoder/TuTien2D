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

import styles from './ChatBox.module.css';

// ... (giữ nguyên imports và interface)

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
                className={styles.toggleButton}
            >
                💬 Chat
            </button>
        );
    }

    return (
        <div className={styles.chatContainer}>
            {/* Header */}
            <div className={styles.header}>
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
            <div className={styles.messages}>
                {chatMessages.map((msg, idx) => (
                    <div
                        key={idx}
                        className={styles.messageItem}
                        style={{
                            backgroundColor: msg.userId === user?.id
                                ? 'rgba(102, 126, 234, 0.3)'
                                : 'rgba(255, 255, 255, 0.05)',
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
            <div className={styles.inputArea}>
                <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Nhập tin nhắn..."
                    maxLength={200}
                    className={styles.input}
                />
                <button
                    onClick={handleSend}
                    disabled={!inputMessage.trim()}
                    className={styles.sendButton}
                    style={{
                        backgroundColor: inputMessage.trim() ? '#667eea' : '#555',
                        cursor: inputMessage.trim() ? 'pointer' : 'not-allowed',
                    }}
                >
                    Gửi
                </button>
            </div>
        </div>
    );
};

export default ChatBox;
