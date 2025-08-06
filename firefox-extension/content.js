// Content script for SoxDrawer Firefox extension

// Create a floating button for quick access
function createFloatingButton() {
  const button = document.createElement('div');
  button.id = 'soxdrawer-floating-button';
  button.innerHTML = '📁';
  button.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 50px;
    height: 50px;
    background: #3b82f6;
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    cursor: pointer;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transition: all 0.2s ease;
    opacity: 0.8;
  `;
  
  button.addEventListener('mouseenter', () => {
    button.style.opacity = '1';
    button.style.transform = 'scale(1.1)';
  });
  
  button.addEventListener('mouseleave', () => {
    button.style.opacity = '0.8';
    button.style.transform = 'scale(1)';
  });
  
  button.addEventListener('click', () => {
    // Send message to background script to open popup
    browser.runtime.sendMessage({
      type: 'OPEN_SOXDRAWER'
    });
  });
  
  document.body.appendChild(button);
}

// Handle drag and drop events
function setupDragAndDrop() {
  document.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Show visual feedback
    document.body.style.border = '3px dashed #3b82f6';
  });
  
  document.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Remove visual feedback
    document.body.style.border = '';
  });
  
  document.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Remove visual feedback
    document.body.style.border = '';
    
    const files = Array.from(e.dataTransfer.files);
    const urls = e.dataTransfer.getData('text/uri-list');
    const text = e.dataTransfer.getData('text/plain');
    
    if (files.length > 0 || urls || text) {
      handleDrop(files, urls, text);
    }
  });
}

// Handle dropped content
async function handleDrop(files, urls, text) {
  try {
    const formData = new FormData();
    
    if (files.length > 0) {
      // Handle files
      files.forEach((file, index) => {
        formData.append('file', file);
        formData.append('type', 'file');
      });
    } else if (urls) {
      // Handle URLs
      const urlBlob = new Blob([urls], { type: 'text/plain' });
      const urlFile = new File([urlBlob], 'url.txt', { type: 'text/plain' });
      formData.append('file', urlFile);
      formData.append('type', 'url');
    } else if (text) {
      // Handle text
      const textBlob = new Blob([text], { type: 'text/plain' });
      const textFile = new File([textBlob], 'text.txt', { type: 'text/plain' });
      formData.append('file', textFile);
      formData.append('type', 'text');
    }
    
    // Send to background script
    browser.runtime.sendMessage({
      type: 'UPLOAD_TO_SOXDRAWER',
      data: { formData }
    });
    
    // Show success notification
    showNotification('Content added to SoxDrawer!', 'success');
    
  } catch (error) {
    console.error('Error handling drop:', error);
    showNotification('Failed to add content to SoxDrawer', 'error');
  }
}

// Show notification
function showNotification(message, type) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    padding: 12px 16px;
    border-radius: 8px;
    color: white;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    z-index: 10001;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    ${type === 'success' ? 'background: #10b981;' : 'background: #ef4444;'}
  `;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  // Remove after 3 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 3000);
}

// Initialize content script
function init() {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
    return;
  }
  
  // Create floating button
  createFloatingButton();
  
  // Setup drag and drop
  setupDragAndDrop();
  
  console.log('SoxDrawer content script initialized');
}

// Start initialization
init(); 