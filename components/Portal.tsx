'use client';

import React, { useEffect, useRef } from 'react';
import { useGameStore } from '@/lib/store';
import { Portal as PortalType } from '@/lib/gameData';

interface PortalProps extends PortalType {}

const INTERACTION_DISTANCE = 40; // Giảm vùng kích hoạt

const Portal: React.FC<PortalProps> = ({ x, y, targetMap, targetX, targetY, label }) => {
    const { currentMapId, playerPosition, setCurrentMapId, setPlayerPosition, setTargetPosition } = useGameStore();
    const hasTriggeredRef = useRef(false);
    
    // Xác định vị trí label dựa trên vị trí portal
    // Nếu portal ở gần cạnh trên (y < 150), đặt label ở dưới
    // Nếu portal ở gần cạnh dưới (y > mapHeight - 150), đặt label ở trên
    // Nếu portal ở bên trái (x < 150), đặt label bên phải
    // Nếu portal ở bên phải (x > mapWidth - 150), đặt label bên trái
    const isNearTop = y < 150;
    const isNearBottom = y > 750; // Giả sử map height trung bình ~900
    const isNearLeft = x < 150;
    const isNearRight = x > 1050; // Giả sử map width trung bình ~1200

    useEffect(() => {
        const distance = Math.sqrt(
            Math.pow(playerPosition.x - x, 2) + Math.pow(playerPosition.y - y, 2)
        );

        if (distance < INTERACTION_DISTANCE && !hasTriggeredRef.current) {
            // Tự động chuyển map khi người chơi đến gần portal
            hasTriggeredRef.current = true;
            setCurrentMapId(targetMap);
            setPlayerPosition(targetX, targetY);
            setTargetPosition(null); // Clear target khi chuyển map
        }
    }, [playerPosition.x, playerPosition.y, x, y, targetMap, targetX, targetY, setCurrentMapId, setPlayerPosition, setTargetPosition]);

    // Reset trigger when map changes (player has moved to new map)
    useEffect(() => {
        hasTriggeredRef.current = false;
    }, [currentMapId]);

    return (
        <div
            style={{
                position: 'absolute',
                left: x,
                top: y,
                width: '80px',
                height: '80px',
                transform: 'translate(-50%, -50%)',
                zIndex: Math.floor(y),
            }}
        >
            {/* Portal visual effect */}
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(100,200,255,0.6) 0%, rgba(50,100,200,0.3) 50%, transparent 70%)',
                    animation: 'portalPulse 2s ease-in-out infinite',
                    boxShadow: '0 0 20px rgba(100,200,255,0.8)',
                }}
            />
            
            {/* Portal label - Position dynamically based on portal location */}
            <div
                style={{
                    position: 'absolute',
                    ...(isNearTop ? { top: '50px' } : isNearBottom ? { bottom: '50px' } : { top: '-30px' }),
                    ...(isNearLeft ? { left: '50px' } : isNearRight ? { right: '50px' } : { left: '50%', transform: 'translateX(-50%)' }),
                    color: '#00ffff',
                    textShadow: '1px 1px 2px black, -1px -1px 2px black, 1px -1px 2px black, -1px 1px 2px black',
                    fontSize: '14px',
                    whiteSpace: 'nowrap',
                    fontWeight: 'bold',
                    pointerEvents: 'none',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    padding: '4px 8px',
                    borderRadius: '4px',
                }}
            >
                {isNearTop ? '⬇' : isNearBottom ? '⬆' : isNearLeft ? '➡' : isNearRight ? '⬅' : '⇨'} {label}
            </div>

            <style jsx>{`
                @keyframes portalPulse {
                    0%, 100% {
                        transform: scale(1);
                        opacity: 0.8;
                    }
                    50% {
                        transform: scale(1.1);
                        opacity: 1;
                    }
                }
            `}</style>
        </div>
    );
};

export default Portal;
