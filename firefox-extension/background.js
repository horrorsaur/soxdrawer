// Background script for SoxDrawer extension

console.log('SoxDrawer background script loaded');

// Listen for extension installation
browser.runtime.onInstalled.addListener((details) => {
  console.log('SoxDrawer extension installed:', details.reason);
  
  if (details.reason === 'install') {
    // Show welcome notification
    browser.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon-48.png',
      title: 'SoxDrawer Installed!',
      message: 'Welcome to SoxDrawer - your object storage companion.'
    }).catch(err => {
      // Notifications might not be available, that's ok
      console.log('Notification not shown:', err.message);
    });
  }
});

// Listen for browser action clicks (when popup is disabled)
browser.browserAction.onClicked.addListener((tab) => {
  console.log('SoxDrawer browser action clicked on tab:', tab.url);
});

// Handle messages from content scripts or popup
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);
  
  if (request.action === 'hello') {
    sendResponse({ message: 'Hello from background script!' });
  }
  
  return true; // Keep the message channel open for async response
});
