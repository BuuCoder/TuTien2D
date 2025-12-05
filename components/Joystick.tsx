'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useGameStore } from '@/lib/store';

const JOYSTICK_SIZE = 100;
const KNOB_SIZE = 40;
const MAX_DISTANCE = 30;

const Joystick = () => {
    const { setJoystickDirection } = useGameStore();
    const [isDragging, setIsDragging] = useState(false);
    const [knobPosition, setKnobPosition] = useState({ x: 0, y: 0 });
    const [isMobile, setIsMobile] = useState(false);
    const joystickRef = useRef<HTMLDivElement>(null);
    const lastUpdateTime = useRef(0);
    const animationFrameRef = useRef<number | null>(null);
    const pendingPosition = useRef<{ clientX: number; clientY: number } | null>(null);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const handleStart = (clientX: number, clientY: number) => {
        setIsDragging(true);
        updateKnobPositionImmediate(clientX, clientY);
    };

    const handleMove = (clientX: number, clientY: number) => {
        if (!isDragging) return;
        
        // Store pending position for RAF
        pendingPosition.current = { clientX, clientY };
        
        // Use requestAnimationFrame for smooth updates
        if (!animationFrameRef.current) {
            animationFrameRef.current = requestAnimationFrame(() => {
                if (pendingPosition.current) {
                    updateKnobPositionImmediate(
                        pendingPosition.current.clientX,
                        pendingPosition.current.clientY
                    );
                    pendingPosition.current = null;
                }
                animationFrameRef.current = null;
            });
        }
    };

    const handleEnd = () => {
        setIsDragging(false);
        setKnobPosition({ x: 0, y: 0 });
        setJoystickDirection(null);
        pendingPosition.current = null;
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
    };

    const updateKnobPositionImmediate = (clientX: number, clientY: number) => {
        if (!joystickRef.current) return;

        const rect = joystickRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        let deltaX = clientX - centerX;
        let deltaY = clientY - centerY;

        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        if (distance > MAX_DISTANCE) {
            const angle = Math.atan2(deltaY, deltaX);
            deltaX = Math.cos(angle) * MAX_DISTANCE;
            deltaY = Math.sin(angle) * MAX_DISTANCE;
        }

        // Always update visual position immediately for responsive feel
        setKnobPosition({ x: deltaX, y: deltaY });

        // Throttle direction updates to store (for movement)
        const now = Date.now();
        if (now - lastUpdateTime.current >= 16) { // ~60fps max
            lastUpdateTime.current = now;
            
            const normalizedX = deltaX / MAX_DISTANCE;
            const normalizedY = deltaY / MAX_DISTANCE;

            setJoystickDirection({ x: normalizedX, y: normalizedY });
        }
    };

    useEffect(() => {
        const joystick = joystickRef.current;
        if (!joystick || !isMobile) return;

        const handleTouchStart = (e: TouchEvent) => {
            e.preventDefault();
            const touch = e.touches[0];
            handleStart(touch.clientX, touch.clientY);
        };

        const handleTouchMove = (e: TouchEvent) => {
            e.preventDefault();
            if (e.touches.length > 0) {
                const touch = e.touches[0];
                handleMove(touch.clientX, touch.clientY);
            }
        };

        const handleTouchEnd = (e: TouchEvent) => {
            e.preventDefault();
            handleEnd();
        };

        const handleMouseDown = (e: MouseEvent) => {
            handleStart(e.clientX, e.clientY);
        };

        const handleMouseMove = (e: MouseEvent) => {
            handleMove(e.clientX, e.clientY);
        };

        const handleMouseUp = () => {
            handleEnd();
        };

        // Add touch events with passive: false to allow preventDefault
        joystick.addEventListener('touchstart', handleTouchStart, { passive: false });
        joystick.addEventListener('touchmove', handleTouchMove, { passive: false });
        joystick.addEventListener('touchend', handleTouchEnd, { passive: false });
        joystick.addEventListener('touchcancel', handleTouchEnd, { passive: false });
        joystick.addEventListener('mousedown', handleMouseDown);

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            window.addEventListener('touchmove', handleTouchMove, { passive: false });
            window.addEventListener('touchend', handleTouchEnd, { passive: false });
            window.addEventListener('touchcancel', handleTouchEnd, { passive: false });
        }

        return () => {
            joystick.removeEventListener('touchstart', handleTouchStart);
            joystick.removeEventListener('touchmove', handleTouchMove);
            joystick.removeEventListener('touchend', handleTouchEnd);
            joystick.removeEventListener('touchcancel', handleTouchEnd);
            joystick.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleTouchEnd);
            window.removeEventListener('touchcancel', handleTouchEnd);
        };
    }, [isDragging, isMobile]);

    // Reset joystick khi component unmount hoặc khi map thay đổi
    const currentMapId = useGameStore((state) => state.currentMapId);
    useEffect(() => {
        return () => {
            // Force reset khi unmount
            setIsDragging(false);
            setKnobPosition({ x: 0, y: 0 });
            setJoystickDirection(null);
            pendingPosition.current = null;
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
        };
    }, [currentMapId, setJoystickDirection]);

    // Ẩn joystick trên desktop
    if (!isMobile) return null;

    return (
        <div
            ref={joystickRef}
            style={{
                position: 'fixed',
                bottom: '80px',
                left: '30px',
                width: `${JOYSTICK_SIZE}px`,
                height: `${JOYSTICK_SIZE}px`,
                borderRadius: '50%',
                backgroundColor: 'rgba(0, 0, 0, 0.2)',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                touchAction: 'none',
                userSelect: 'none',
                zIndex: 1000,
                opacity: isDragging ? 0.8 : 0.4,
                transition: 'opacity 0.2s',
            }}
        >
            <div
                style={{
                    position: 'absolute',
                    width: `${KNOB_SIZE}px`,
                    height: `${KNOB_SIZE}px`,
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255, 255, 255, 0.6)',
                    border: '2px solid rgba(0, 0, 0, 0.2)',
                    transform: `translate(${knobPosition.x}px, ${knobPosition.y}px)`,
                    transition: isDragging ? 'none' : 'transform 0.2s ease-out',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                    pointerEvents: 'none',
                }}
            />
        </div>
    );
};

export default Joystick;
