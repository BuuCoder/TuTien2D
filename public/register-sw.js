// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('[PWA] Service Worker registered:', registration.scope);

        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          console.log('[PWA] New service worker found');

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[PWA] New content available, please refresh');
              // Optionally show update notification
              if (confirm('Có phiên bản mới! Reload để cập nhật?')) {
                newWorker.postMessage({ type: 'SKIP_WAITING' });
                window.location.reload();
              }
            }
          });
        });
      })
      .catch((error) => {
        console.error('[PWA] Service Worker registration failed:', error);
      });

    // Handle controller change
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[PWA] Controller changed, reloading page');
      window.location.reload();
    });
  });
}
