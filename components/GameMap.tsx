'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Player from './Player';
import NPC from './NPC';
import OtherPlayers from './OtherPlayers';
import PlayerChatBubbles from './PlayerChatBubbles';
import Portal from './Portal';
import { useGameStore } from '@/lib/store';
import { MAPS } from '@/lib/gameData';

const GameMap = () => {
    const { currentMapId, playerPosition, cameraOffset, setCameraOffset } = useGameStore();
    const [viewportSize, setViewportSize] = useState({ width: 800, height: 600 });
    const [isMounted, setIsMounted] = useState(false);
    
    const currentMap = useMemo(() => MAPS[currentMapId] || MAPS['map1'], [currentMapId]);

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

        camX = Math.max(0, Math.min(camX, currentMap.width - viewportSize.width));
        camY = Math.max(0, Math.min(camY, currentMap.height - viewportSize.height));

        setCameraOffset(camX, camY);
    }, [playerPosition.x, playerPosition.y, viewportSize.width, viewportSize.height, setCameraOffset, isMounted, currentMap.width, currentMap.height]);

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

    // Calculate centering offset if viewport is larger than map
    const centeringOffsetX = Math.max(0, (viewportSize.width - currentMap.width) / 2);
    const centeringOffsetY = Math.max(0, (viewportSize.height - currentMap.height) / 2);

    const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
        // Only handle clicks on the game world, not UI elements
        if (e.target === e.currentTarget || (e.target as HTMLElement).closest('[data-game-world]')) {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const clickY = e.clientY - rect.top;

            // Adjust for centering offset
            const adjustedClickX = clickX - centeringOffsetX;
            const adjustedClickY = clickY - centeringOffsetY;

            // Convert screen coordinates to world coordinates
            const worldX = adjustedClickX + cameraOffset.x;
            const worldY = adjustedClickY + cameraOffset.y;

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
                    width: `${currentMap.width}px`,
                    height: `${currentMap.height}px`,
                    left: -cameraOffset.x + centeringOffsetX,
                    top: -cameraOffset.y + centeringOffsetY,
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
                        backgroundImage: `url(${currentMap.background})`,
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
                    }}
                />

                {/* Render NPCs from current map */}
                {currentMap.npcs.map((npc) => (
                    <NPC key={npc.id} id={npc.id} x={npc.x} y={npc.y} type={npc.type as any} />
                ))}

                {/* Render Portals from current map */}
                {currentMap.portals.map((portal, index) => (
                    <Portal key={`portal-${index}`} {...portal} />
                ))}

                <OtherPlayers />
                <Player />
                <PlayerChatBubbles />
            </div>
        </div>
    );
};

export default GameMap;
