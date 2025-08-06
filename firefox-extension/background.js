// Background script for SoxDrawer Firefox extension

// Handle browser action click
browser.browserAction.onClicked.addListener((tab) => {
  // Open the popup in a new tab for better UX
  browser.tabs.create({
    url: browser.runtime.getURL('popup.html'),
    active: true
  });
});

// Handle messages from content script
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'UPLOAD_TO_SOXDRAWER') {
    // Handle upload request from content script
    handleUpload(message.data);
  }
});

// Handle upload to SoxDrawer
async function handleUpload(data) {
  try {
    // Get the configured SoxDrawer URL from storage
    const result = await browser.storage.local.get(['soxdrawerUrl']);
    const soxdrawerUrl = result.soxdrawerUrl || 'http://localhost:8080';
    
    // Upload the data to SoxDrawer
    const response = await fetch(`${soxdrawerUrl}/api/upload`, {
      method: 'POST',
      body: data.formData,
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    if (response.ok) {
      console.log('Successfully uploaded to SoxDrawer');
    } else {
      console.error('Failed to upload to SoxDrawer:', response.statusText);
    }
  } catch (error) {
    console.error('Error uploading to SoxDrawer:', error);
  }
}

// Initialize extension
browser.runtime.onInstalled.addListener(() => {
  // Set default SoxDrawer URL
  browser.storage.local.set({
    soxdrawerUrl: 'http://localhost:8080'
  });
  
  console.log('SoxDrawer extension installed');
}); 