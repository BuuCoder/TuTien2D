'use client';

import React from 'react';
import { useGameStore } from '@/lib/store';
import { MAPS } from '@/lib/gameData';

const MapName = () => {
    const { currentMapId } = useGameStore();
    
    const currentMap = MAPS[currentMapId];
    if (!currentMap) return null;

    return (
        <div
            style={{
                position: 'fixed',
                top: '20px',
                right: '20px',
                backgroundColor: 'rgba(0, 0, 0, 0.85)',
                borderRadius: '12px',
                padding: '12px 20px',
                zIndex: 1000,
                border: '2px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                userSelect: 'none',
            }}
        >
            <div style={{
                color: 'white',
                fontSize: '16px',
                fontWeight: 'bold',
                textAlign: 'center',
                textShadow: '0 2px 4px rgba(0,0,0,0.8)',
            }}>
                📍 {currentMap.name}
            </div>
        </div>
    );
};

export default MapName;
