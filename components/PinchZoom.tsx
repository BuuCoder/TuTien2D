'use client';

import React, { useRef, useEffect, useState } from 'react';

interface PinchZoomProps {
  children: React.ReactNode;
  minZoom?: number;
  maxZoom?: number;
}

const PinchZoom: React.FC<PinchZoomProps> = ({ 
  children, 
  minZoom = 0.9,  // -10%
  maxZoom = 1.1   // +10%
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const lastDistanceRef = useRef<number | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let initialDistance = 0;
    let initialScale = 1;

    const getDistance = (touches: TouchList) => {
      const touch1 = touches[0];
      const touch2 = touches[1];
      const dx = touch2.clientX - touch1.clientX;
      const dy = touch2.clientY - touch1.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        initialDistance = getDistance(e.touches);
        initialScale = scale;
        lastDistanceRef.current = initialDistance;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        
        const currentDistance = getDistance(e.touches);
        
        if (lastDistanceRef.current) {
          // Calculate scale change
          const scaleChange = currentDistance / initialDistance;
          let newScale = initialScale * scaleChange;
          
          // Clamp between min and max
          newScale = Math.max(minZoom, Math.min(maxZoom, newScale));
          
          setScale(newScale);
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        lastDistanceRef.current = null;
      }
    };

    // Add event listeners with passive: false to allow preventDefault
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [scale, minZoom, maxZoom]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        position: 'relative',
        touchAction: 'none', // Disable default touch behaviors
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          transition: 'transform 0.05s ease-out',
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default PinchZoom;
