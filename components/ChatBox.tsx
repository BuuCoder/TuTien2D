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
    const { socket, currentChannel, currentMapId, user, chatMessages, addChatMessage } = useGameStore();
    const [inputMessage, setInputMessage] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);

    // Setup socket listeners
    useEffect(() => {
        if (!socket) return;

        socket.on('chat_message', (data: ChatMessage) => {
            addChatMessage(data);
        });

        socket.on('chat_history', (history: ChatMessage[]) => {
            // Clear old messages and load history
            const state = useGameStore.getState();
            state.chatMessages = [];
            history.forEach(msg => addChatMessage(msg));
            
            // Scroll to bottom immediately after loading history
            setTimeout(() => {
                if (messagesContainerRef.current) {
                    messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
                }
            }, 200);
        });

        return () => {
            socket.off('chat_message');
            socket.off('chat_history');
        };
    }, [socket, addChatMessage]);

    // Load chat history when map or channel changes
    useEffect(() => {
        if (!socket || !currentMapId || !currentChannel) return;
        
        // Request chat history for current map and channel
        socket.emit('load_chat_history', {
            mapId: currentMapId,
            channelId: currentChannel
        });
    }, [socket, currentMapId, currentChannel]);

    // Auto scroll to bottom when new messages arrive or chat opens
    useEffect(() => {
        // Scroll container to bottom
        if (messagesContainerRef.current && isOpen) {
            setTimeout(() => {
                if (messagesContainerRef.current) {
                    messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
                }
            }, 100);
        }
    }, [chatMessages, isOpen]);

    const handleSend = () => {
        if (!inputMessage.trim() || !socket || !user) return;

        // Send to server (server will broadcast to all including sender)
        socket.emit('send_chat', {
            message: inputMessage,
            mapId: currentMapId
        });

        setInputMessage('');
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Track unread messages - persist across open/close
    const [unreadCount, setUnreadCount] = useState(0);
    const lastSeenCountRef = useRef(0);
    const hasInitializedRef = useRef(false);

    // Initialize lastSeenCountRef on first load (don't count history as unread)
    useEffect(() => {
        if (!hasInitializedRef.current && chatMessages.length > 0) {
            lastSeenCountRef.current = chatMessages.length;
            hasInitializedRef.current = true;
        }
    }, [chatMessages]);

    // Update unread count when chat is closed and new messages arrive
    useEffect(() => {
        if (!hasInitializedRef.current) return;
        if (!user) return;

        if (!isOpen && chatMessages.length > lastSeenCountRef.current) {
            const newMessages = chatMessages.slice(lastSeenCountRef.current);
            const newUnreadFromOthers = newMessages.filter(msg => msg.userId !== user.id).length;
            
            if (newUnreadFromOthers > 0) {
                setUnreadCount(prev => prev + newUnreadFromOthers);
            }
            
            lastSeenCountRef.current = chatMessages.length;
        }
    }, [chatMessages, isOpen, user]);

    // Reset unread when opening chat
    const handleOpenChat = () => {
        setIsOpen(true);
        setUnreadCount(0);
        lastSeenCountRef.current = chatMessages.length;
        setTimeout(() => {
            if (messagesContainerRef.current) {
                messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
            }
        }, 100);
    };

    if (!isOpen) {
        return (
            <>
                <button
                    onClick={handleOpenChat}
                    className={styles.toggleButton}
                >
                    💬 Chat
                    {unreadCount > 0 && (
                        <div 
                            className="unread-badge"
                            style={{
                                position: 'absolute',
                                top: '-5px',
                                right: '-5px',
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                backgroundColor: '#ff4444',
                                color: 'white',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 2px 8px rgba(255, 68, 68, 0.6)',
                                pointerEvents: 'none',
                                zIndex: 10001
                            }}
                        >
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </div>
                    )}
                </button>
                <style>{`
                    @keyframes pulse {
                        0%, 100% { transform: scale(1); }
                        50% { transform: scale(1.1); }
                    }
                    .unread-badge {
                        animation: pulse 2s infinite;
                    }
                `}</style>
            </>
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
            <div ref={messagesContainerRef} className={styles.messages}>
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
