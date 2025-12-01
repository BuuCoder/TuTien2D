'use client';

import React from 'react';
import { useGameStore } from '@/lib/store';

const TargetIndicator = () => {
    const { targetPosition, cameraOffset } = useGameStore();

    if (!targetPosition) return null;

    // Convert world position to screen position
    const screenX = targetPosition.x - cameraOffset.x;
    const screenY = targetPosition.y - cameraOffset.y;

    return (
        <div
            style={{
                position: 'fixed',
                left: screenX,
                top: screenY,
                width: '40px',
                height: '40px',
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'none',
                zIndex: 9999,
            }}
        >
            {/* Outer ring */}
            <div
                style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    border: '3px solid rgba(76, 175, 80, 0.8)',
                    animation: 'pulse 1s ease-out infinite',
                }}
            />
            {/* Inner dot */}
            <div
                style={{
                    position: 'absolute',
                    width: '12px',
                    height: '12px',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(76, 175, 80, 0.9)',
                    boxShadow: '0 0 10px rgba(76, 175, 80, 0.6)',
                }}
            />
        </div>
    );
};

export default TargetIndicator;
