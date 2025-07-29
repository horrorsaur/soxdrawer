// Import the NATS client
importScripts('nats-client.js');

console.log('SoxDrawer background script loaded');

// Initialize the NATS client
const natsClient = new ExtensionNATSClient();
let serverStatus = 'disconnected';

// Function to start the NATS server connection
async function startNATS() {
  try {
    console.log('Starting NATS connection from background...');
    await natsClient.connect();
    serverStatus = 'connected';
    console.log('✅ NATS client is ready in background script');

    // Test by adding a file to the mock store
    const objectStore = await natsClient.getObjectStore();
    await objectStore.put('welcome.txt', 'Hello from the background script!', {
      description: 'Initial file from background script'
    });
    
  } catch (error) {
    serverStatus = 'error';
    console.error('❌ Failed to start NATS client:', error);
  }
}

// Start NATS when the extension is installed
browser.runtime.onInstalled.addListener((details) => {
  console.log('SoxDrawer extension installed:', details.reason);
  
  if (details.reason === 'install' || details.reason === 'update') {
    startNATS();
    
    browser.notifications.create({
      type: 'basic',
      title: 'SoxDrawer Ready',
      message: 'SoxDrawer NATS server is running in the background.'
    }).catch(err => {
      console.log('Notification not shown:', err.message);
    });
  }
});

// Start NATS on browser startup
browser.runtime.onStartup.addListener(() => {
  console.log('SoxDrawer extension started with browser');
  startNATS();
});

// Handle messages from popup or content scripts
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);
  
  if (request.action === 'get_status') {
    const status = {
      nats: natsClient.isConnected() ? 'connected' : 'disconnected',
      connectionInfo: natsClient.getConnectionInfo()
    };
    
    sendResponse({ status: 'success', data: status });
    
  } else if (request.action === 'list_objects') {
    if (!natsClient.isConnected()) {
      sendResponse({ status: 'error', message: 'NATS not connected' });
      return true;
    }
    
    natsClient.getObjectStore()
      .then(store => store.list())
      .then(objects => {
        sendResponse({ status: 'success', data: objects });
      })
      .catch(error => {
        sendResponse({ status: 'error', message: error.message });
      });
    
    return true; // Keep message channel open for async response
    
  } else if (request.action === 'get_object') {
    if (!natsClient.isConnected()) {
      sendResponse({ status: 'error', message: 'NATS not connected' });
      return true;
    }
    
    natsClient.getObjectStore()
      .then(store => store.get(request.key))
      .then(result => {
        sendResponse({ status: 'success', data: result });
      })
      .catch(error => {
        sendResponse({ status: 'error', message: error.message });
      });
      
    return true; // Keep message channel open for async response
  }
  
  // Return true for any other async message handlers
  return false;
});

// Start NATS connection when the script is first loaded
startNATS();
