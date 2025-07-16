// notify.js
const notificationSound = new Audio('notification.mp3'); // You'll need to provide an actual sound file

function playNotificationSound() {
    notificationSound.play().catch(error => {
        console.warn("Could not play notification sound (user interaction might be needed):", error);
        // Fallback for browsers that block autoplay: Request notification permission
        if (Notification.permission === 'granted' && document.hidden) {
            new Notification('New Message', {
                body: 'You have a new message!',
                icon: 'chat-icon.png'
            });
        }
    });
}

// Request permission for Web Notifications API (for when browser is minimized)
if (Notification.permission !== 'granted') {
    Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
            console.log('Notification permission granted.');
        } else {
            console.warn('Notification permission denied.');
        }
    });
}

// Export function if using modules, otherwise it's globally available
// export { playNotificationSound }; // If you're using ES modules (not inlined script)
