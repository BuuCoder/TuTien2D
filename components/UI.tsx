'use client';

import React, { useEffect, useState } from 'react';
import { useGameStore } from '@/lib/store';
import { MAPS } from '@/lib/gameData';

const Instructions = () => {
    const [isMobile, setIsMobile] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const { currentMapId, currentChannel } = useGameStore();

    useEffect(() => {
        setIsMounted(true);
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    if (!isMounted) return null;

    const currentMap = MAPS[currentMapId];

    return (
        <>
            {/* Map Name & Channel Display - Top Left */}
            <div style={{
                position: 'fixed',
                top: '15px',
                left: '15px',
                color: 'white',
                backgroundColor: 'rgba(0,0,0,0.6)',
                padding: '8px 14px',
                borderRadius: '6px',
                fontFamily: 'sans-serif',
                zIndex: 100,
                fontSize: '13px',
                border: '1px solid rgba(255,255,255,0.2)',
                backdropFilter: 'blur(4px)',
            }}>
                <div style={{ 
                    fontWeight: 'bold', 
                    marginBottom: '2px',
                    fontSize: '14px',
                }}>
                    📍 {currentMap?.name || 'Unknown'}
                </div>
                {currentChannel && (
                    <div style={{ 
                        fontSize: '11px', 
                        color: '#aaa',
                        fontWeight: 'normal'
                    }}>
                        Kênh {currentChannel}
                    </div>
                )}
            </div>

            {/* Instructions - Desktop only */}
            {!isMobile && (
                <div style={{
                    position: 'fixed',
                    bottom: '20px',
                    left: '20px',
                    color: 'white',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    padding: '10px',
                    borderRadius: '5px',
                    fontFamily: 'sans-serif',
                    zIndex: 100,
                    fontSize: '12px'
                }}>
                    <p style={{ margin: '5px 0' }}>WASD / Arrows to Move</p>
                    <p style={{ margin: '5px 0' }}>E to Interact</p>
                </div>
            )}
        </>
    );
};

export default Instructions;
