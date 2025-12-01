'use client';

import React, { useEffect, useRef, useMemo } from 'react';
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

const NPC_NAMES: Record<string, string> = {
    'merchant': 'Thương Buôn',
    'healer': 'Y Sư',
    'village-elder': 'Trưởng Làng',
    'guard': 'Lính Canh',
};

const NPC: React.FC<NPCProps> = ({ id, x, y, type }) => {
    const { playerPosition, setNearbyNPCId, setIsInteracting, addNPCMessage, npcMessages, setActiveMenu } = useGameStore();
    const wasInRangeRef = useRef(false);
    const hasGreetedRef = useRef(false); // Track if already greeted this approach
    const autoGreetTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const npcMessage = useMemo(() => npcMessages.find(m => m.npcId === id), [npcMessages, id]);

    // Auto-greet when player approaches
    useEffect(() => {
        const distance = Math.sqrt(
            Math.pow(playerPosition.x - x, 2) + Math.pow(playerPosition.y - y, 2)
        );
        const inRange = distance < INTERACTION_DISTANCE;

        if (inRange && !wasInRangeRef.current) {
            setNearbyNPCId(id);
            wasInRangeRef.current = true;

            // Only greet if haven't greeted yet for this approach
            if (!hasGreetedRef.current) {
                console.log(`[NPC ${id}] Player approached, showing greeting`);
                hasGreetedRef.current = true;

                // Auto-display greeting message
                if (autoGreetTimeoutRef.current) {
                    clearTimeout(autoGreetTimeoutRef.current);
                }
                
                // Fetch greeting message
                fetch('/api/interact', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        npcId: id,
                        action: 'greet',
                        timestamp: new Date().toISOString(),
                    }),
                })
                .then(res => res.json())
                .then(data => {
                    console.log(`[NPC ${id}] Greeting response:`, data);
                    if (data.success && data.message) {
                        addNPCMessage(id, data.message);
                        autoGreetTimeoutRef.current = setTimeout(() => {
                            useGameStore.getState().clearNPCMessage(id);
                        }, 5000);
                    }
                })
                .catch(err => console.error(`[NPC ${id}] Auto-greet failed:`, err));
            }

        } else if (!inRange && wasInRangeRef.current) {
            const currentNearby = useGameStore.getState().nearbyNPCId;
            if (currentNearby === id) {
                setNearbyNPCId(null);
            }
            wasInRangeRef.current = false;
            hasGreetedRef.current = false; // Reset greeting flag when player leaves
            
            // Clear message and timeout when player leaves
            useGameStore.getState().clearNPCMessage(id);
            if (autoGreetTimeoutRef.current) {
                clearTimeout(autoGreetTimeoutRef.current);
                autoGreetTimeoutRef.current = null;
            }
        }

        return () => {
            if (autoGreetTimeoutRef.current) {
                clearTimeout(autoGreetTimeoutRef.current);
            }
        };
    }, [playerPosition.x, playerPosition.y, x, y, id, setNearbyNPCId, addNPCMessage]);

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

                            if (data.menu || data.quests) {
                                setActiveMenu({ 
                                    npcId: id, 
                                    menu: data.menu || [], 
                                    quests: data.quests || [] 
                                });
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



    return (
        <div
            style={{
                position: 'absolute',
                left: x,
                top: y,
                width: '64px',
                height: '64px',
                transform: 'translate(-50%, -50%)',
                zIndex: Math.floor(y),
            }}
        >
            {/* NPC Sprite */}
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    backgroundImage: `url(${NPC_SPRITES[type]})`,
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                }}
            >
                {/* NPC Name */}
                <div style={{
                    position: 'absolute',
                    top: '-20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    color: '#ffeb3b',
                    textShadow: '1px 1px 2px black, -1px -1px 2px black, 1px -1px 2px black, -1px 1px 2px black',
                    fontSize: '12px',
                    whiteSpace: 'nowrap',
                    fontWeight: 'bold',
                    pointerEvents: 'none'
                }}>
                    {NPC_NAMES[type] || type}
                </div>

                {/* Message Bubble */}
                {npcMessage && (
                    <div
                        style={{
                            position: 'absolute',
                            left: '50%',
                            bottom: '70px',
                            transform: 'translateX(-50%)',
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            color: '#333',
                            padding: '8px 12px',
                            borderRadius: '12px',
                            fontSize: '13px',
                            fontFamily: 'sans-serif',
                            width: '200px',
                            textAlign: 'center',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                            border: '2px solid #4CAF50',
                            zIndex: 10000,
                            pointerEvents: 'none',
                            whiteSpace: 'normal',
                            wordWrap: 'break-word',
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
            </div>
        </div>
    );
};

export default NPC;
