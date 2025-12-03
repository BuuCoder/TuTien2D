'use client';

import React, { useEffect, useState } from 'react';
import { useGameStore } from '@/lib/store';

interface PlayerChatBubble {
    userId: number;
    message: string;
    timestamp: number;
}

const PlayerChatBubbles = () => {
    const { chatMessages, otherPlayers, user, playerPosition } = useGameStore();
    const [activeBubbles, setActiveBubbles] = useState<Map<number, PlayerChatBubble>>(new Map());
    const [lastMessageCount, setLastMessageCount] = useState(0);

    useEffect(() => {
        // Only show bubble for NEW messages (not history)
        if (chatMessages.length === 0) return;

        // Skip if this is initial load (history load)
        if (lastMessageCount === 0 && chatMessages.length > 1) {
            setLastMessageCount(chatMessages.length);
            return;
        }

        // Only process if message count increased (new message)
        if (chatMessages.length <= lastMessageCount) return;

        const latestMessage = chatMessages[chatMessages.length - 1];

        // Check if message is recent (within last 5 seconds)
        const messageAge = Date.now() - latestMessage.timestamp;
        if (messageAge > 5000) {
            setLastMessageCount(chatMessages.length);
            return;
        }

        const newBubbles = new Map(activeBubbles);
        newBubbles.set(latestMessage.userId, {
            userId: latestMessage.userId,
            message: latestMessage.message,
            timestamp: Date.now()
        });

        setActiveBubbles(newBubbles);
        setLastMessageCount(chatMessages.length);

        // Xóa sau 8 giây
        setTimeout(() => {
            setActiveBubbles(prev => {
                const updated = new Map(prev);
                updated.delete(latestMessage.userId);
                return updated;
            });
        }, 8000);
    }, [chatMessages, lastMessageCount, activeBubbles]);

    return (
        <>
            {/* Bubble cho người chơi hiện tại */}
            {user && activeBubbles.has(user.id) && (
                <div style={{
                    position: 'absolute',
                    left: playerPosition.x,
                    top: playerPosition.y - 80,
                    transform: 'translateX(-50%)',
                    zIndex: 10000
                }}>
                    <div style={{
                        backgroundColor: 'rgba(17, 17, 17, 0.95)',
                        backdropFilter: 'blur(10px)',
                        color: '#f9fafb',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: '500',
                        letterSpacing: '-0.01em',
                        maxWidth: '200px',
                        wordWrap: 'break-word',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                        border: '1px solid rgba(59, 130, 246, 0.4)',
                        position: 'relative',
                        lineHeight: '1.4'
                    }}>
                        {activeBubbles.get(user.id)?.message}
                        <div style={{
                            position: 'absolute',
                            bottom: '-6px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: 0,
                            height: 0,
                            borderLeft: '6px solid transparent',
                            borderRight: '6px solid transparent',
                            borderTop: '6px solid rgba(17, 17, 17, 0.95)'
                        }} />
                    </div>
                </div>
            )}

            {/* Bubbles cho người chơi khác */}
            {Array.from(otherPlayers.values()).map((player) => {
                const bubble = activeBubbles.get(player.userId || 0);
                if (!bubble || !player.userId) return null;

                return (
                    <div
                        key={player.id}
                        style={{
                            position: 'absolute',
                            left: player.x,
                            top: player.y - 80,
                            transform: 'translateX(-50%)',
                            zIndex: 10000
                        }}
                    >
                        <div style={{
                            backgroundColor: 'rgba(17, 17, 17, 0.95)',
                            backdropFilter: 'blur(10px)',
                            color: '#f9fafb',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: '500',
                            letterSpacing: '-0.01em',
                            maxWidth: '200px',
                            wordWrap: 'break-word',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            position: 'relative',
                            lineHeight: '1.4'
                        }}>
                            {bubble.message}
                            <div style={{
                                position: 'absolute',
                                bottom: '-6px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                width: 0,
                                height: 0,
                                borderLeft: '6px solid transparent',
                                borderRight: '6px solid transparent',
                                borderTop: '6px solid rgba(17, 17, 17, 0.95)'
                            }} />
                        </div>
                    </div>
                );
            })}
        </>
    );
};

export default PlayerChatBubbles;
