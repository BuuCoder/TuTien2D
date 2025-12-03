// Mobile fullscreen handler
(function () {
    'use strict';

    // Detect mobile device
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (!isMobile) return;

    // Hide address bar on load
    function hideAddressBar() {
        if (window.scrollY === 0) {
            window.scrollTo(0, 1);
        }
    }

    // Request fullscreen
    function requestFullscreen() {
        const elem = document.documentElement;

        if (elem.requestFullscreen) {
            elem.requestFullscreen().catch(err => {
                console.log('Fullscreen request failed:', err);
            });
        } else if (elem.webkitRequestFullscreen) { // Safari
            elem.webkitRequestFullscreen();
        } else if (elem.mozRequestFullScreen) { // Firefox
            elem.mozRequestFullScreen();
        } else if (elem.msRequestFullscreen) { // IE/Edge
            elem.msRequestFullscreen();
        }
    }

    // Set viewport height dynamically
    function setViewportHeight() {
        // Get actual viewport height
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);

        // Force layout recalculation
        document.body.style.height = `${window.innerHeight}px`;
    }

    // Lock orientation to landscape
    function lockLandscape() {
        if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock('landscape').catch(err => {
                console.log('Orientation lock failed:', err);
            });
        }
    }

    // Prevent zoom on double tap
    let lastTouchEnd = 0;
    document.addEventListener('touchend', function (event) {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
            event.preventDefault();
        }
        lastTouchEnd = now;
    }, { passive: false });

    // Prevent pinch zoom
    document.addEventListener('gesturestart', function (e) {
        e.preventDefault();
    });

    document.addEventListener('gesturechange', function (e) {
        e.preventDefault();
    });

    document.addEventListener('gestureend', function (e) {
        e.preventDefault();
    });

    // Initialize on load
    window.addEventListener('load', function () {
        setTimeout(hideAddressBar, 100);
        setTimeout(setViewportHeight, 200);
        setTimeout(lockLandscape, 300);
    });

    // Update on resize/orientation change
    window.addEventListener('resize', setViewportHeight);
    window.addEventListener('orientationchange', function () {
        setTimeout(hideAddressBar, 100);
        setTimeout(setViewportHeight, 200);
        setTimeout(lockLandscape, 300);
    });

    // Try to enter fullscreen on first user interaction
    let hasInteracted = false;
    const interactionEvents = ['touchstart', 'click', 'keydown'];

    function handleFirstInteraction() {
        if (hasInteracted) return;
        hasInteracted = true;

        // Remove listeners
        interactionEvents.forEach(event => {
            document.removeEventListener(event, handleFirstInteraction);
        });

        // Request fullscreen
        setTimeout(requestFullscreen, 100);
    }

    // Add listeners for first interaction
    interactionEvents.forEach(event => {
        document.addEventListener(event, handleFirstInteraction, { once: true });
    });

    // iOS specific: prevent bounce scroll
    document.addEventListener('touchmove', function (e) {
        // Allow scrolling in INPUT, TEXTAREA, and ChatBox messages
        const target = e.target;
        const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

        // Check if the target or any parent is the chatbox messages container
        const isChatBoxScroll = target.closest('[class*="messages"]') ||
            target.closest('[class*="chatContainer"]') ||
            target.classList.contains('messages') ||
            target.classList.contains('chatContainer');

        if (!isInput && !isChatBoxScroll) {
            e.preventDefault();
        }
    }, { passive: false });

    // Set initial viewport
    setViewportHeight();
})();
