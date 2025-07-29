// NATS Client for Firefox Extension
// Simplified version that works within extension limitations

class ExtensionNATSClient {
  constructor(config = {}) {
    this.config = {
      servers: config.servers || ['ws://localhost:8080'],
      reconnect: config.reconnect !== false,
      maxReconnectAttempts: config.maxReconnectAttempts || 10,
      reconnectTimeWait: config.reconnectTimeWait || 2000,
      ...config
    };
    
    this.ws = null;
    this.connected = false;
    this.reconnectAttempts = 0;
    this.subscriptions = new Map();
    this.requestId = 0;
    this.pendingRequests = new Map();
    this.objectStore = null;
    
    console.log('🔧 ExtensionNATSClient initialized with config:', this.config);
  }

  async connect() {
    return new Promise((resolve, reject) => {
      try {
        console.log('🚀 Attempting to connect to NATS...');
        
        // For now, we'll simulate a connection since we can't directly connect to NATS from extension
        // In a real implementation, we'd need a WebSocket proxy or use the extension's native messaging
        setTimeout(() => {
          this.connected = true;
          this.reconnectAttempts = 0;
          console.log('✅ Simulated NATS connection established');
          
          // Initialize mock object store
          this.objectStore = new MockObjectStore();
          
          resolve(this);
        }, 100);
        
      } catch (error) {
        console.error('❌ Failed to connect to NATS:', error);
        reject(error);
      }
    });
  }

  async disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
    console.log('🛑 NATS connection closed');
  }

  isConnected() {
    return this.connected;
  }

  async getObjectStore(bucketName = 'default') {
    if (!this.connected) {
      throw new Error('Not connected to NATS');
    }
    
    console.log(`📦 Getting object store: ${bucketName}`);
    return this.objectStore;
  }

  getConnectionInfo() {
    return {
      connected: this.connected,
      server: this.config.servers[0],
      reconnectAttempts: this.reconnectAttempts,
    };
  }
}

// Mock Object Store for testing within extension
class MockObjectStore {
  constructor() {
    this.objects = new Map();
    console.log('🗃️ Mock ObjectStore initialized');
  }

  async put(key, data, metadata = {}) {
    const objectInfo = {
      name: key,
      size: data.length || data.byteLength || 0,
      created: new Date().toISOString(),
      digest: this.generateDigest(key),
      chunks: 1,
      metadata: metadata
    };
    
    this.objects.set(key, {
      data: data,
      info: objectInfo
    });
    
    console.log(`✅ Mock stored object '${key}' (${objectInfo.size} bytes)`);
    return objectInfo;
  }

  async get(key) {
    const stored = this.objects.get(key);
    if (!stored) {
      throw new Error(`Object '${key}' not found`);
    }
    
    console.log(`✅ Mock retrieved object '${key}'`);
    return {
      data: stored.data,
      info: stored.info
    };
  }

  async getString(key) {
    const result = await this.get(key);
    return typeof result.data === 'string' ? result.data : new TextDecoder().decode(result.data);
  }

  async getInfo(key) {
    const stored = this.objects.get(key);
    if (!stored) {
      throw new Error(`Object '${key}' not found`);
    }
    
    return stored.info;
  }

  async delete(key) {
    const existed = this.objects.delete(key);
    if (!existed) {
      throw new Error(`Object '${key}' not found`);
    }
    
    console.log(`✅ Mock deleted object '${key}'`);
    return true;
  }

  async list() {
    const objects = [];
    for (const [key, stored] of this.objects.entries()) {
      objects.push(stored.info);
    }
    
    console.log(`✅ Mock listed ${objects.length} objects`);
    return objects;
  }

  async exists(key) {
    return this.objects.has(key);
  }

  async getStatus() {
    return {
      bucket: 'default',
      description: 'Mock object store for Firefox extension',
      size: this.objects.size,
      objects: this.objects.size,
      storage: 'memory',
      replicas: 1,
    };
  }

  generateDigest(key) {
    // Simple hash for testing
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ExtensionNATSClient, MockObjectStore };
} else {
  // Browser environment
  window.ExtensionNATSClient = ExtensionNATSClient;
  window.MockObjectStore = MockObjectStore;
}
