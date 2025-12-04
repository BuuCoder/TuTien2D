'use client';

import React, { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const PWAInstallButton = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isInstallable, setIsInstallable] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true);
            return;
        }

        // Listen for beforeinstallprompt event
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setIsInstallable(true);
            console.log('[PWA] Install prompt available');
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Listen for app installed event
        window.addEventListener('appinstalled', () => {
            console.log('[PWA] App installed');
            setIsInstalled(true);
            setIsInstallable(false);
            setDeferredPrompt(null);
        });

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) {
            console.log('[PWA] No install prompt available');
            return;
        }

        // Show install prompt
        deferredPrompt.prompt();

        // Wait for user choice
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`[PWA] User choice: ${outcome}`);

        if (outcome === 'accepted') {
            console.log('[PWA] User accepted install');
        } else {
            console.log('[PWA] User dismissed install');
        }

        // Clear prompt
        setDeferredPrompt(null);
        setIsInstallable(false);
    };

    // Don't show button if already installed
    if (isInstalled) {
        return (
            <div style={{
                position: 'fixed',
                bottom: '20px',
                right: '20px',
                backgroundColor: 'rgba(16, 185, 129, 0.95)',
                color: 'white',
                padding: '12px 20px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
            }}>
                ✅ App đã cài đặt
            </div>
        );
    }

    // Don't show button if not installable
    if (!isInstallable) {
        return null;
    }

    return (
        <button
            onClick={handleInstallClick}
            style={{
                position: 'fixed',
                bottom: '20px',
                right: '20px',
                backgroundColor: 'rgba(59, 130, 246, 0.95)',
                color: 'white',
                padding: '14px 24px',
                borderRadius: '12px',
                border: 'none',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(59, 130, 246, 0.4)',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                transition: 'all 0.2s ease',
                animation: 'pulse 2s infinite'
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.5)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(59, 130, 246, 0.4)';
            }}
        >
            <span style={{ fontSize: '20px' }}>📱</span>
            <span>Cài đặt App</span>
            <style jsx>{`
                @keyframes pulse {
                    0%, 100% {
                        opacity: 1;
                    }
                    50% {
                        opacity: 0.8;
                    }
                }
            `}</style>
        </button>
    );
};

export default PWAInstallButton;
