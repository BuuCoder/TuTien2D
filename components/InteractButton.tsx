'use client';

import React from 'react';
import { useGameStore } from '@/lib/store';

const InteractButton = () => {
    const { nearbyNPCId, setIsInteracting, addNPCMessage, setActiveMenu } = useGameStore();

    const handleInteract = async () => {
        const { isInteracting, nearbyNPCId: npcId } = useGameStore.getState();
        if (isInteracting || !npcId) return;

        setIsInteracting(true);

        try {
            const response = await fetch('/api/interact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    npcId: npcId,
                    action: 'talk',
                    timestamp: new Date().toISOString(),
                }),
            });

            const data = await response.json();

            if (data.success && data.message) {
                addNPCMessage(data.npcId, data.message);

                if (data.menu) {
                    setActiveMenu({ npcId: data.npcId, menu: data.menu });
                }

                setTimeout(() => {
                    useGameStore.getState().clearNPCMessage(data.npcId);
                }, 5000);
            }
        } catch (error) {
            console.error('Interaction failed', error);
        } finally {
            setIsInteracting(false);
        }
    };

    if (!nearbyNPCId) return null;

    return (
        <button
            onClick={handleInteract}
            style={{
                position: 'fixed',
                bottom: '30px',
                right: '30px',
                width: '70px',
                height: '70px',
                borderRadius: '50%',
                backgroundColor: 'rgba(76, 175, 80, 0.6)',
                color: 'white',
                border: '2px solid rgba(255, 255, 255, 0.5)',
                fontSize: '14px',
                fontWeight: 'bold',
                fontFamily: 'sans-serif',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                cursor: 'pointer',
                zIndex: 1000,
                touchAction: 'manipulation',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                gap: '3px',
                opacity: 0.5,
                transition: 'opacity 0.2s, transform 0.1s',
            }}
            onMouseDown={(e) => {
                e.currentTarget.style.transform = 'scale(0.95)';
                e.currentTarget.style.opacity = '0.8';
            }}
            onMouseUp={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.opacity = '0.5';
            }}
            onTouchStart={(e) => {
                e.currentTarget.style.transform = 'scale(0.95)';
                e.currentTarget.style.opacity = '0.8';
            }}
            onTouchEnd={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.opacity = '0.5';
            }}
        >
            <span style={{ fontSize: '24px' }}>💬</span>
            <span style={{ fontSize: '11px' }}>TALK</span>
        </button>
    );
};

export default InteractButton;
