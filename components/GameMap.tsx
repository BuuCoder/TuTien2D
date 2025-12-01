'use client';

import React, { useEffect, useState } from 'react';
import Player from './Player';
import NPC from './NPC';
import { useGameStore } from '@/lib/store';

const MAP_WIDTH = 1200;
const MAP_HEIGHT = 900;

const GameMap = () => {
    const { playerPosition, cameraOffset, setCameraOffset } = useGameStore();
    const [viewportSize, setViewportSize] = useState({ width: 800, height: 600 });
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);

        const updateViewport = () => {
            const width = window.innerWidth;
            const height = window.innerHeight;
            setViewportSize({ width, height });
        };

        updateViewport();
        window.addEventListener('resize', updateViewport);
        window.addEventListener('orientationchange', updateViewport);

        return () => {
            window.removeEventListener('resize', updateViewport);
            window.removeEventListener('orientationchange', updateViewport);
        };
    }, []);

    useEffect(() => {
        if (!isMounted) return;

        let camX = playerPosition.x - viewportSize.width / 2;
        let camY = playerPosition.y - viewportSize.height / 2;

        camX = Math.max(0, Math.min(camX, MAP_WIDTH - viewportSize.width));
        camY = Math.max(0, Math.min(camY, MAP_HEIGHT - viewportSize.height));

        setCameraOffset(camX, camY);
    }, [playerPosition, viewportSize, setCameraOffset, isMounted]);

    if (!isMounted) {
        return (
            <div
                style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    backgroundColor: '#76b041',
                    overflow: 'hidden',
                }}
            />
        );
    }

    const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
        // Only handle clicks on the game world, not UI elements
        if (e.target === e.currentTarget || (e.target as HTMLElement).closest('[data-game-world]')) {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const clickY = e.clientY - rect.top;

            // Convert screen coordinates to world coordinates
            const worldX = clickX + cameraOffset.x;
            const worldY = clickY + cameraOffset.y;

            // Set target position
            useGameStore.getState().setTargetPosition({ x: worldX, y: worldY });
        }
    };

    return (
        <div
            style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                overflow: 'hidden',
                touchAction: 'none',
                backgroundColor: '#76b041', // Fallback color
            }}
            onClick={handleMapClick}
        >
            {/* Game world layer */}
            <div
                data-game-world="true"
                style={{
                    position: 'absolute',
                    width: `${MAP_WIDTH}px`,
                    height: `${MAP_HEIGHT}px`,
                    left: -cameraOffset.x,
                    top: -cameraOffset.y,
                    transition: 'left 0.1s ease-out, top 0.1s ease-out',
                    zIndex: 1,
                }}
            >
                {/* Background image - moves with camera */}
                <div
                    data-game-world="true"
                    style={{
                        position: 'absolute',
                        width: '100%',
                        height: '100%',
                        backgroundImage: 'url(/assets/background/background_04.jpeg)',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        zIndex: 0,
                    }}
                />

                {/* Grid overlay */}
                <div
                    data-game-world="true"
                    style={{
                        position: 'absolute',
                        width: '100%',
                        height: '100%',
                        backgroundImage: `
              repeating-linear-gradient(0deg, transparent, transparent 49px, rgba(0,0,0,0.1) 49px, rgba(0,0,0,0.1) 50px),
              repeating-linear-gradient(90deg, transparent, transparent 49px, rgba(0,0,0,0.1) 49px, rgba(0,0,0,0.1) 50px)
            `,
                        pointerEvents: 'none',
                        zIndex: 1,
                    }}
                />

                <NPC id="merchant" x={600} y={300} type="merchant" />
                <NPC id="healer" x={900} y={600} type="healer" />
                <NPC id="village-elder" x={300} y={700} type="village-elder" />

                <Player />
            </div>
        </div>
    );
};

export default GameMap;
