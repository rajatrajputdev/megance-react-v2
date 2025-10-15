// clearSW.js — auto removes old Netlify PWA service workers
export function clearOldServiceWorkers() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        registration.unregister().then(() => {
          console.log('✅ Old service worker unregistered');
        });
      });
    }).catch((err) => console.log('SW cleanup error:', err));
  }
}
