document.addEventListener('DOMContentLoaded', function() {
  console.log('SoxDrawer popup loaded');
  
  // DOM elements
  const natsIndicator = document.getElementById('natsIndicator');
  const natsStatus = document.getElementById('natsStatus');
  const connectionInfo = document.getElementById('connectionInfo');
  const refreshStatusBtn = document.getElementById('refreshStatusBtn');
  const listObjectsBtn = document.getElementById('listObjectsBtn');
  const objectsContainer = document.getElementById('objectsContainer');
  
  // Update status display
  function updateStatus(status) {
    if (status.nats === 'connected') {
      natsIndicator.className = 'status-indicator status-connected';
      natsStatus.textContent = 'Connected';
      listObjectsBtn.disabled = false;
    } else {
      natsIndicator.className = 'status-indicator status-disconnected';
      natsStatus.textContent = 'Disconnected';
      listObjectsBtn.disabled = true;
    }
    
    // Show connection info
    if (status.connectionInfo) {
      connectionInfo.innerHTML = `
        <div>Server: ${status.connectionInfo.server || 'N/A'}</div>
        <div>Reconnect Attempts: ${status.connectionInfo.reconnectAttempts || 0}</div>
      `;
    }
  }
  
  // Show error message
  function showError(message) {
    objectsContainer.innerHTML = `<div class="error">Error: ${message}</div>`;
  }
  
  // Display objects list
  function displayObjects(objects) {
    if (objects.length === 0) {
      objectsContainer.innerHTML = '<div class="loading">No objects found</div>';
      return;
    }
    
    const objectsHtml = objects.map(obj => `
      <div class="object-item">
        <strong>${obj.name}</strong><br>
        Size: ${obj.size} bytes<br>
        Created: ${new Date(obj.created).toLocaleString()}
      </div>
    `).join('');
    
    objectsContainer.innerHTML = `
      <div class="objects-list">
        ${objectsHtml}
      </div>
    `;
  }
  
  // Send message to background script
  function sendMessage(action, data = {}) {
    return new Promise((resolve, reject) => {
      browser.runtime.sendMessage({ action, ...data }, (response) => {
        if (browser.runtime.lastError) {
          reject(new Error(browser.runtime.lastError.message));
        } else if (response && response.status === 'error') {
          reject(new Error(response.message));
        } else {
          resolve(response);
        }
      });
    });
  }
  
  // Get status from background script
  async function refreshStatus() {
    try {
      console.log('Requesting status from background...');
      const response = await sendMessage('get_status');
      console.log('Status response:', response);
      
      if (response && response.data) {
        updateStatus(response.data);
      }
    } catch (error) {
      console.error('Error getting status:', error);
      showError(`Failed to get status: ${error.message}`);
    }
  }
  
  // List objects from background script
  async function listObjects() {
    try {
      objectsContainer.innerHTML = '<div class="loading">Loading objects...</div>';
      
      console.log('Requesting objects list from background...');
      const response = await sendMessage('list_objects');
      console.log('Objects response:', response);
      
      if (response && response.data) {
        displayObjects(response.data);
      }
    } catch (error) {
      console.error('Error listing objects:', error);
      showError(`Failed to list objects: ${error.message}`);
    }
  }
  
  // Event listeners
  refreshStatusBtn.addEventListener('click', refreshStatus);
  listObjectsBtn.addEventListener('click', listObjects);
  
  // Initial status check
  refreshStatus();
  
  console.log('SoxDrawer popup initialized');
});
