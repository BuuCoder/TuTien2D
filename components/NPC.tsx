'use client';

import React, { useEffect, useRef } from 'react';
import { useGameStore } from '@/lib/store';

interface NPCProps {
    id: string;
    x: number;
    y: number;
    type: 'merchant' | 'healer' | 'village-elder' | 'guard';
}

const INTERACTION_DISTANCE = 80;

const NPC_SPRITES: Record<string, string> = {
    'merchant': '/assets/npc/business/down_idle.gif',
    'healer': '/assets/npc/healer/down_idle.gif',
    'village-elder': '/assets/npc/village/down_idle.gif',
    'guard': '/assets/npc/village/down_idle.gif',
};

const NPC: React.FC<NPCProps> = ({ id, x, y, type }) => {
    const { playerPosition, setNearbyNPCId, setIsInteracting, addNPCMessage, npcMessages, setActiveMenu, cameraOffset } = useGameStore();
    const wasInRangeRef = useRef(false);

    const npcMessage = npcMessages.find(m => m.npcId === id);

    useEffect(() => {
        const distance = Math.sqrt(
            Math.pow(playerPosition.x - x, 2) + Math.pow(playerPosition.y - y, 2)
        );
        const inRange = distance < INTERACTION_DISTANCE;

        if (inRange && !wasInRangeRef.current) {
            setNearbyNPCId(id);
            wasInRangeRef.current = true;
        } else if (!inRange && wasInRangeRef.current) {
            const currentNearby = useGameStore.getState().nearbyNPCId;
            if (currentNearby === id) {
                setNearbyNPCId(null);
            }
            wasInRangeRef.current = false;
        }
    }, [playerPosition, x, y, id, setNearbyNPCId]);

    useEffect(() => {
        const handleKeyDown = async (e: KeyboardEvent) => {
            if (e.key.toLowerCase() === 'e') {
                const { playerPosition, isInteracting, nearbyNPCId } = useGameStore.getState();
                if (isInteracting || nearbyNPCId !== id) return;

                const distance = Math.sqrt(
                    Math.pow(playerPosition.x - x, 2) + Math.pow(playerPosition.y - y, 2)
                );

                if (distance < INTERACTION_DISTANCE) {
                    setIsInteracting(true);

                    try {
                        const response = await fetch('/api/interact', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                npcId: id,
                                action: 'talk',
                                timestamp: new Date().toISOString(),
                            }),
                        });

                        const data = await response.json();

                        if (data.success && data.message) {
                            addNPCMessage(id, data.message);

                            if (data.menu) {
                                setActiveMenu({ npcId: id, menu: data.menu });
                            }

                            setTimeout(() => {
                                useGameStore.getState().clearNPCMessage(id);
                            }, 5000);
                        }
                    } catch (error) {
                        console.error('Interaction failed', error);
                    } finally {
                        setIsInteracting(false);
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [x, y, id, setIsInteracting, addNPCMessage, setActiveMenu]);

    // Calculate screen position (world position - camera offset)
    const screenX = x - cameraOffset.x;
    const screenY = y - cameraOffset.y;

    return (
        <>
            {/* NPC Sprite */}
            <div
                style={{
                    position: 'absolute',
                    left: x,
                    top: y,
                    width: '64px',
                    height: '64px',
                    backgroundImage: `url(${NPC_SPRITES[type]})`,
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    transform: 'translate(-50%, -50%)',
                    zIndex: Math.floor(y),
                }}
            />

            {/* Message Bubble - Fixed to screen position */}
            {npcMessage && (
                <div
                    style={{
                        position: 'fixed',
                        left: screenX,
                        top: screenY - 60,
                        transform: 'translateX(-50%)',
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        color: '#333',
                        padding: '8px 12px',
                        borderRadius: '12px',
                        fontSize: '13px',
                        fontFamily: 'sans-serif',
                        maxWidth: '200px',
                        textAlign: 'center',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                        border: '2px solid #4CAF50',
                        zIndex: 10000,
                        animation: 'fadeIn 0.3s ease-out',
                        pointerEvents: 'none',
                    }}
                >
                    {npcMessage.message}
                    <div
                        style={{
                            position: 'absolute',
                            bottom: '-8px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: '0',
                            height: '0',
                            borderLeft: '8px solid transparent',
                            borderRight: '8px solid transparent',
                            borderTop: '8px solid #4CAF50',
                        }}
                    />
                    <div
                        style={{
                            position: 'absolute',
                            bottom: '-6px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: '0',
                            height: '0',
                            borderLeft: '7px solid transparent',
                            borderRight: '7px solid transparent',
                            borderTop: '7px solid rgba(255, 255, 255, 0.95)',
                        }}
                    />
                </div>
            )}
        </>
    );
};

export default NPC;
