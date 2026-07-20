// Background service worker for ChessMint extension

// Listen for extension installation
chrome.runtime.onInstalled.addListener((details: any) => {
    if (details.reason === 'install') {
        console.log('ChessMint extension installed');
    } else if (details.reason === 'update') {
        console.log('ChessMint extension updated');
    }
});

// Keep the service worker alive
chrome.runtime.onStartup.addListener(() => {
    console.log('ChessMint browser started');
});
