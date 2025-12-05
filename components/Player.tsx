'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import { useGameStore } from '@/lib/store';
import { MAPS } from '@/lib/gameData';
import { calculatePlayerSpeed } from '@/lib/skinStatsHelper';
import { getSkinById } from '@/lib/skinData';

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
    
    // Get skin data for display size
    const skinData = useMemo(() => getSkinById(currentSkin), [currentSkin]);
    const displaySize = skinData?.displaySize || 64; // Mặc định 64px
    
    // Calculate speed with skin bonus
    const SPEED = useMemo(() => calculatePlayerSpeed(currentSkin), [currentSkin]);

    const keysPressed = useRef<Set<string>>(new Set());
    const animationFrameId = useRef<number | null>(null);

    // Setup keyboard listeners (only once)
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

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    // Game Loop (only setup once, reads from store directly)
    useEffect(() => {
        const gameLoop = () => {
            // Get fresh state from store every frame
            const state = useGameStore.getState();
            const currentPlayerPos = state.playerPosition;
            const currentJoystick = state.joystickDirection;
            const currentTarget = state.targetPosition;
            const currentAction = state.playerAction;
            const mapData = MAPS[state.currentMapId] || MAPS['map1'];

            let dx = 0;
            let dy = 0;
            let hasManualInput = false;

            // Keyboard input
            const keys = keysPressed.current;
            if (keys.has('w') || keys.has('arrowup')) { dy -= SPEED; hasManualInput = true; }
            if (keys.has('s') || keys.has('arrowdown')) { dy += SPEED; hasManualInput = true; }
            if (keys.has('a') || keys.has('arrowleft')) { dx -= SPEED; hasManualInput = true; }
            if (keys.has('d') || keys.has('arrowright')) { dx += SPEED; hasManualInput = true; }

            // Joystick input (for mobile) - 1.3x multiplier để match WASD speed
            if (currentJoystick) {
                const joystickMultiplier = 1.3;
                dx += currentJoystick.x * SPEED * joystickMultiplier;
                dy += currentJoystick.y * SPEED * joystickMultiplier;
                hasManualInput = true;
            }

            // Click-to-move: if no manual input and target exists
            if (!hasManualInput && currentTarget) {
                const distX = currentTarget.x - currentPlayerPos.x;
                const distY = currentTarget.y - currentPlayerPos.y;
                const distance = Math.sqrt(distX * distX + distY * distY);

                if (distance > TARGET_THRESHOLD) {
                    // Normalize and apply speed (1.2x faster for smoother feel)
                    const clickSpeed = SPEED * 1.2;
                    dx = (distX / distance) * clickSpeed;
                    dy = (distY / distance) * clickSpeed;
                } else {
                    // Reached target
                    state.setTargetPosition(null);
                }
            } else if (hasManualInput && currentTarget) {
                // Cancel click-to-move if manual input
                state.setTargetPosition(null);
            }

            if (dx !== 0 || dy !== 0) {
                // Normalize diagonal movement
                if (dx !== 0 && dy !== 0) {
                    const factor = 1 / Math.sqrt(2);
                    dx *= factor;
                    dy *= factor;
                }

                let newX = currentPlayerPos.x + dx;
                let newY = currentPlayerPos.y + dy;

                // Clamp to map boundaries
                newX = Math.max(32, Math.min(newX, mapData.width - 32));
                newY = Math.max(32, Math.min(newY, mapData.height - 32));

                state.setPlayerPosition(newX, newY);

                // Update direction based on movement
                if (Math.abs(dx) > Math.abs(dy)) {
                    state.setPlayerDirection(dx > 0 ? 'right' : 'left');
                } else {
                    state.setPlayerDirection(dy > 0 ? 'down' : 'up');
                }
            }

            // Update action in store
            const newAction = (dx !== 0 || dy !== 0) ? 'run' : 'idle';
            if (newAction !== currentAction) {
                state.setPlayerAction(newAction);
            }

            animationFrameId.current = requestAnimationFrame(gameLoop);
        };

        animationFrameId.current = requestAnimationFrame(gameLoop);

        return () => {
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
        };
    }, [SPEED]); // Only restart if SPEED changes (skin change)

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
                width: `${displaySize}px`,
                height: `${displaySize}px`,
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
