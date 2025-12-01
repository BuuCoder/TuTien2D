'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useGameStore } from '@/lib/store';

const SPEED = 5;
const MAP_WIDTH = 1200;
const MAP_HEIGHT = 900;
const TARGET_THRESHOLD = 10; // Distance to consider target reached

const Player = () => {
    const {
        playerPosition,
        setPlayerPosition,
        joystickDirection,
        targetPosition,
        setTargetPosition,
        playerDirection: direction,
        setPlayerDirection: setDirection,
        playerAction,
        setPlayerAction
    } = useGameStore();

    // We can keep isMoving local as it's derived from dx/dy, but we need to update store action
    const [isMoving, setIsMoving] = useState(false);

    const keysPressed = useRef<Set<string>>(new Set());
    const animationFrameId = useRef<number | null>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
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
                    // Normalize and apply speed
                    dx = (distX / distance) * SPEED;
                    dy = (distY / distance) * SPEED;
                } else {
                    // Reached target
                    setTargetPosition(null);
                }
            } else if (hasManualInput && targetPosition) {
                // Cancel click-to-move if manual input
                setTargetPosition(null);
            }

            if (dx !== 0 || dy !== 0) {
                setIsMoving(true);

                // Normalize diagonal movement
                if (dx !== 0 && dy !== 0) {
                    const factor = 1 / Math.sqrt(2);
                    dx *= factor;
                    dy *= factor;
                }

                let newX = playerPosition.x + dx;
                let newY = playerPosition.y + dy;

                // Clamp to map boundaries
                newX = Math.max(32, Math.min(newX, MAP_WIDTH - 32));
                newY = Math.max(32, Math.min(newY, MAP_HEIGHT - 32));

                setPlayerPosition(newX, newY);

                // Update direction based on movement
                if (Math.abs(dx) > Math.abs(dy)) {
                    setDirection(dx > 0 ? 'right' : 'left');
                } else {
                    setDirection(dy > 0 ? 'down' : 'up');
                }
            } else {
                setIsMoving(false);
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
    }, [playerPosition, setPlayerPosition, joystickDirection, targetPosition, setTargetPosition, setDirection, setPlayerAction, playerAction]);

    const action = isMoving ? 'run' : 'idle';
    // When idle, always use down_idle regardless of direction
    const gifPath = action === 'idle'
        ? `/assets/knight/idle/down_idle.gif`
        : `/assets/knight/${action}/${direction}_${action}.gif`;

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
                zIndex: 1000,
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
                Tiểu Hiệp
            </div>
        </div>
    );
};

export default Player;
