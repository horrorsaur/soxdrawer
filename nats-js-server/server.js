import { NATSServer } from './nats-server.js';
import { HTTPServer } from './http-server.js';

class SoxDrawerServer {
  constructor(config = {}) {
    this.config = {
      nats: {
        servers: config.nats?.servers || ['nats://localhost:4222'],
        jetstream: true,
        ...config.nats
      },
      http: {
        port: config.http?.port || 8080,
        host: config.http?.host || 'localhost',
        ...config.http
      },
      ...config
    };
    
    this.natsServer = null;
    this.httpServer = null;
  }

  async start() {
    try {
      console.log('🚀 Starting SoxDrawer JS Server...');
      console.log(`Configuration:`, {
        nats: this.config.nats,
        http: this.config.http
      });

      // Start NATS server connection
      this.natsServer = new NATSServer(this.config.nats);
      await this.natsServer.start();

      // Start HTTP server
      this.httpServer = new HTTPServer(this.natsServer, this.config.http);
      await this.httpServer.start();

      console.log('✅ SoxDrawer JS Server started successfully!');
      console.log(`🌐 HTTP API: http://${this.config.http.host}:${this.config.http.port}`);
      console.log(`📡 NATS: ${this.config.nats.servers.join(', ')}`);

      // Handle graceful shutdown
      this.setupGracefulShutdown();

      return this;
    } catch (error) {
      console.error('❌ Failed to start SoxDrawer server:', error);
      await this.stop();
      throw error;
    }
  }

  async stop() {
    console.log('🛑 Stopping SoxDrawer JS Server...');

    try {
      if (this.httpServer) {
        await this.httpServer.stop();
      }
      
      if (this.natsServer) {
        await this.natsServer.stop();
      }
      
      console.log('✅ SoxDrawer JS Server stopped gracefully');
    } catch (error) {
      console.error('❌ Error during server shutdown:', error);
    }
  }

  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      console.log(`\n📡 Received ${signal}, shutting down gracefully...`);
      await this.stop();
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', async (error) => {
      console.error('❌ Uncaught Exception:', error);
      await this.stop();
      process.exit(1);
    });
    
    process.on('unhandledRejection', async (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
      await this.stop();
      process.exit(1);
    });
  }

  // Health check method
  getStatus() {
    return {
      nats: this.natsServer?.isConnected() || false,
      http: !!this.httpServer?.server,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
  }
}

// Default configuration
const defaultConfig = {
  nats: {
    servers: process.env.NATS_SERVERS?.split(',') || ['nats://localhost:4222'],
  },
  http: {
    port: parseInt(process.env.HTTP_PORT || '8080'),
    host: process.env.HTTP_HOST || 'localhost',
  }
};

// Start the server if this file is run directly
if (import.meta.main) {
  const server = new SoxDrawerServer(defaultConfig);
  
  try {
    await server.start();
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

export { SoxDrawerServer };
export default SoxDrawerServer;
