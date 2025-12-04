'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import { useGameStore } from '@/lib/store';
import { MAPS } from '@/lib/gameData';
import { calculatePlayerSpeed } from '@/lib/skinStatsHelper';

const TARGET_THRESHOLD = 10; // Distance to consider target reached

const Player = () => {
    const {
        currentMapId,
        playerPosition,
        setPlayerPosition,
        joystickDirection,
        targetPosition,
        setTargetPosition,
        playerDirection: direction,
        setPlayerDirection: setDirection,
        playerAction,
        setPlayerAction,
        user
    } = useGameStore();

    const currentMap = useMemo(() => {
        return MAPS[currentMapId] || MAPS['map1'];
    }, [currentMapId]);

    // Get current skin from user data, default to 'knight'
    const currentSkin = user?.skin || 'knight';
    
    // Calculate speed with skin bonus
    const SPEED = useMemo(() => calculatePlayerSpeed(currentSkin), [currentSkin]);

    const keysPressed = useRef<Set<string>>(new Set());
    const animationFrameId = useRef<number | null>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Không di chuyển nếu đang gõ trong input hoặc textarea
            const activeElement = document.activeElement;
            if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
                return;
            }
            keysPressed.current.add(e.key.toLowerCase());
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            keysPressed.current.delete(e.key.toLowerCase());
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        // Game Loop
        const gameLoop = () => {
            let dx = 0;
            let dy = 0;
            let hasManualInput = false;

            // Keyboard input
            const keys = keysPressed.current;
            if (keys.has('w') || keys.has('arrowup')) { dy -= SPEED; hasManualInput = true; }
            if (keys.has('s') || keys.has('arrowdown')) { dy += SPEED; hasManualInput = true; }
            if (keys.has('a') || keys.has('arrowleft')) { dx -= SPEED; hasManualInput = true; }
            if (keys.has('d') || keys.has('arrowright')) { dx += SPEED; hasManualInput = true; }

            // Joystick input (for mobile)
            if (joystickDirection) {
                dx += joystickDirection.x * SPEED;
                dy += joystickDirection.y * SPEED;
                hasManualInput = true;
            }

            // Click-to-move: if no manual input and target exists
            if (!hasManualInput && targetPosition) {
                const distX = targetPosition.x - playerPosition.x;
                const distY = targetPosition.y - playerPosition.y;
                const distance = Math.sqrt(distX * distX + distY * distY);

                if (distance > TARGET_THRESHOLD) {
                    // Normalize and apply speed (1.2x faster for smoother feel)
                    const clickSpeed = SPEED * 1.2;
                    dx = (distX / distance) * clickSpeed;
                    dy = (distY / distance) * clickSpeed;
                } else {
                    // Reached target
                    setTargetPosition(null);
                }
            } else if (hasManualInput && targetPosition) {
                // Cancel click-to-move if manual input
                setTargetPosition(null);
            }

            if (dx !== 0 || dy !== 0) {

                // Normalize diagonal movement
                if (dx !== 0 && dy !== 0) {
                    const factor = 1 / Math.sqrt(2);
                    dx *= factor;
                    dy *= factor;
                }

                let newX = playerPosition.x + dx;
                let newY = playerPosition.y + dy;

                // Clamp to map boundaries
                newX = Math.max(32, Math.min(newX, currentMap.width - 32));
                newY = Math.max(32, Math.min(newY, currentMap.height - 32));

                setPlayerPosition(newX, newY);

                // Update direction based on movement
                if (Math.abs(dx) > Math.abs(dy)) {
                    setDirection(dx > 0 ? 'right' : 'left');
                } else {
                    setDirection(dy > 0 ? 'down' : 'up');
                }
            }

            // Update action in store
            const newAction = (dx !== 0 || dy !== 0) ? 'run' : 'idle';
            if (newAction !== playerAction) {
                setPlayerAction(newAction);
            }

            animationFrameId.current = requestAnimationFrame(gameLoop);
        };

        animationFrameId.current = requestAnimationFrame(gameLoop);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
        };
    }, [playerPosition, setPlayerPosition, joystickDirection, targetPosition, setTargetPosition, setDirection, setPlayerAction, playerAction, currentMap.width, currentMap.height, SPEED]);

    // When idle, always use down_idle regardless of direction
    const gifPath = playerAction === 'idle'
        ? `/assets/${currentSkin}/idle/down_idle.gif`
        : `/assets/${currentSkin}/${playerAction}/${direction}_${playerAction}.gif`;

    return (
        <div
            style={{
                position: 'absolute',
                left: playerPosition.x,
                top: playerPosition.y,
                width: '64px',
                height: '64px',
                backgroundImage: `url(${gifPath})`,
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                transform: 'translate(-50%, -50%)',
                zIndex: Math.floor(playerPosition.y), // Z-index based on Y position
            }}
        >
            <div style={{
                position: 'absolute',
                top: '-20px',
                left: '50%',
                transform: 'translateX(-50%)',
                color: 'white',
                textShadow: '1px 1px 2px black, -1px -1px 2px black, 1px -1px 2px black, -1px 1px 2px black',
                fontSize: '14px',
                whiteSpace: 'nowrap',
                fontWeight: 'bold',
                pointerEvents: 'none'
            }}>
                {user?.username || 'Tiểu Hiệp'}
            </div>
        </div>
    );
};

export default Player;
