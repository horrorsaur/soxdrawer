import { connect, NatsConnection, JetStreamManager, ObjectStore } from '@nats-io/nats-core';
import { jetstream } from '@nats-io/jetstream';

export class NATSServer {
  constructor(config = {}) {
    this.config = {
      servers: config.servers || ['nats://localhost:4222'],
      jetstream: config.jetstream || true,
      ...config
    };
    this.nc = null;
    this.js = null;
    this.jsm = null;
    this.objectStores = new Map();
  }

  async start() {
    try {
      console.log('🚀 Starting NATS connection...');
      
      // Connect to NATS server
      this.nc = await connect({
        servers: this.config.servers,
        name: 'soxdrawer-js-server',
      });

      console.log(`✅ Connected to NATS server: ${this.nc.getServer()}`);

      if (this.config.jetstream) {
        // Initialize JetStream
        this.js = jetstream(this.nc);
        this.jsm = await this.js.jetstreamManager();
        
        console.log('✅ JetStream initialized');

        // Create default object store
        await this.createObjectStore('default');
      }

      // Handle connection events
      this.nc.closed().then((err) => {
        if (err) {
          console.error('❌ NATS connection closed with error:', err);
        } else {
          console.log('✅ NATS connection closed gracefully');
        }
      });

      return this;
    } catch (error) {
      console.error('❌ Failed to start NATS server:', error);
      throw error;
    }
  }

  async createObjectStore(bucketName) {
    try {
      console.log(`📦 Creating object store: ${bucketName}`);
      
      const objectStore = await this.js.objectStore(bucketName);
      this.objectStores.set(bucketName, objectStore);
      
      console.log(`✅ Object store '${bucketName}' ready`);
      return objectStore;
    } catch (error) {
      // If bucket doesn't exist, create it
      if (error.message.includes('not found')) {
        try {
          console.log(`📦 Object store '${bucketName}' not found, creating...`);
          
          const objectStore = await this.js.objectStore(bucketName, {
            description: `SoxDrawer object store: ${bucketName}`,
            storage: 'file',
            replicas: 1
          });
          
          this.objectStores.set(bucketName, objectStore);
          console.log(`✅ Object store '${bucketName}' created successfully`);
          return objectStore;
        } catch (createError) {
          console.error(`❌ Failed to create object store '${bucketName}':`, createError);
          throw createError;
        }
      } else {
        console.error(`❌ Failed to access object store '${bucketName}':`, error);
        throw error;
      }
    }
  }

  getObjectStore(bucketName = 'default') {
    const store = this.objectStores.get(bucketName);
    if (!store) {
      throw new Error(`Object store '${bucketName}' not found`);
    }
    return store;
  }

  async stop() {
    try {
      console.log('🛑 Stopping NATS server...');
      
      if (this.nc) {
        await this.nc.drain();
        await this.nc.close();
      }
      
      console.log('✅ NATS server stopped gracefully');
    } catch (error) {
      console.error('❌ Error stopping NATS server:', error);
      throw error;
    }
  }

  // Health check
  isConnected() {
    return this.nc && !this.nc.isClosed();
  }

  getConnectionInfo() {
    if (!this.nc) {
      return null;
    }

    return {
      server: this.nc.getServer(),
      connected: !this.nc.isClosed(),
      stats: this.nc.stats(),
    };
  }
}

export default NATSServer;
