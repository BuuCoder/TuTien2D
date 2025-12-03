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

    // Clear unread count when changing map/channel
    useEffect(() => {
        setUnreadCount(0);
        lastSeenCountRef.current = chatMessages.length;
        hasInitializedRef.current = false; // Reset để không count history là unread
    }, [currentMapId, currentChannel]);

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

    // Prevent touch events from propagating to GameMap
    const handleTouchEvent = (e: React.TouchEvent) => {
        // Stop the event from bubbling up to GameMap
        e.stopPropagation();
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
        <div
            className={styles.chatContainer}
            onTouchStart={handleTouchEvent}
            onTouchMove={handleTouchEvent}
            onTouchEnd={handleTouchEvent}
        >
            {/* Header */}
            <div className={styles.header}>
                <div style={{ 
                    color: '#f9fafb', 
                    fontWeight: '600', 
                    fontSize: '14px',
                    letterSpacing: '-0.01em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                }}>
                    <span style={{ fontSize: '16px' }}>💬</span>
                    Chat - Kênh {currentChannel || '?'}
                </div>
                <button
                    onClick={() => setIsOpen(false)}
                    style={{
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '4px',
                        color: '#ef4444',
                        cursor: 'pointer',
                        fontSize: '16px',
                        padding: '4px 8px',
                        fontWeight: '600',
                        transition: 'all 0.15s ease',
                        lineHeight: 1
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                    }}
                >
                    ✕
                </button>
            </div>

            {/* Messages */}
            <div
                ref={messagesContainerRef}
                className={styles.messages}
                onTouchStart={handleTouchEvent}
                onTouchMove={handleTouchEvent}
                onTouchEnd={handleTouchEvent}
            >
                {chatMessages.map((msg, idx) => (
                    <div
                        key={idx}
                        className={styles.messageItem}
                        style={{
                            backgroundColor: msg.userId === user?.id
                                ? 'rgba(59, 130, 246, 0.15)'
                                : 'rgba(255, 255, 255, 0.04)',
                            borderLeft: msg.userId === user?.id
                                ? '2px solid #3b82f6'
                                : '2px solid rgba(255, 255, 255, 0.1)'
                        }}
                    >
                        <div style={{
                            fontSize: '11px',
                            color: msg.userId === user?.id ? '#60a5fa' : '#9ca3af',
                            marginBottom: '4px',
                            fontWeight: '600',
                            letterSpacing: '-0.01em'
                        }}>
                            {msg.username}
                        </div>
                        <div style={{
                            fontSize: '13px',
                            color: '#f9fafb',
                            wordWrap: 'break-word',
                            lineHeight: '1.5',
                            letterSpacing: '-0.01em'
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
                        background: inputMessage.trim() 
                            ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.9) 0%, rgba(37, 99, 235, 0.9) 100%)'
                            : 'rgba(55, 65, 81, 0.5)',
                        cursor: inputMessage.trim() ? 'pointer' : 'not-allowed',
                        border: inputMessage.trim() 
                            ? '1px solid rgba(59, 130, 246, 0.3)'
                            : '1px solid rgba(255, 255, 255, 0.08)',
                    }}
                >
                    Gửi
                </button>
            </div>
        </div>
    );
};

export default ChatBox;
