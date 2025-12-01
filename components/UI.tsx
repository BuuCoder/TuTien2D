'use client';

import React, { useEffect, useState } from 'react';
import { useGameStore } from '@/lib/store';

const Instructions = () => {
    const [isMobile, setIsMobile] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    if (!isMounted || isMobile) return null;

    return (
        <div style={{
            position: 'fixed',
            top: '20px',
            left: '20px',
            color: 'white',
            backgroundColor: 'rgba(0,0,0,0.5)',
            padding: '10px',
            borderRadius: '5px',
            fontFamily: 'sans-serif',
            zIndex: 100
        }}>
            <p style={{ margin: '5px 0' }}>WASD / Arrows to Move</p>
            <p style={{ margin: '5px 0' }}>E to Interact</p>
        </div>
    );
};

export default Instructions;
