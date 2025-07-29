# SoxDrawer NATS JavaScript Server

A JavaScript implementation of the SoxDrawer server using NATS.js, JetStream, and Object Storage. Built with Bun for optimal performance.

## Features

- **NATS JetStream Integration**: Full JetStream support with object storage
- **Object Storage**: Compatible API with the Go version
- **HTTP REST API**: Same endpoints as the Go server
- **Bun Runtime**: Optimized for Bun's fast JavaScript runtime
- **CORS Support**: Ready for browser-based clients
- **Graceful Shutdown**: Proper cleanup on termination

## Prerequisites

- **Bun**: Install from [bun.sh](https://bun.sh)
- **NATS Server**: Running NATS server with JetStream enabled

### Starting NATS Server with JetStream

```bash
# Download and start NATS server with JetStream
nats-server -js
```

## Installation

```bash
# Install dependencies
bun install
```

## Usage

### Basic Usage

```bash
# Start the server
bun run start

# Start in development mode (with auto-reload)
bun run dev
```

### Environment Variables

```bash
# NATS configuration
export NATS_SERVERS="nats://localhost:4222"

# HTTP server configuration  
export HTTP_PORT=8080
export HTTP_HOST=localhost

# Start server
bun run start
```

### Programmatic Usage

```javascript
import { SoxDrawerServer } from './server.js';

const server = new SoxDrawerServer({
  nats: {
    servers: ['nats://localhost:4222'],
  },
  http: {
    port: 8080,
    host: 'localhost',
  }
});

await server.start();
```

## API Endpoints

The server provides the same REST API as the Go version:

### Upload File
```bash
POST /upload
Content-Type: multipart/form-data

# Form field: file
```

### List Objects
```bash
GET /list
```

### Download Object
```bash
GET /download/:key
```

### Delete Object
```bash
DELETE /delete/:key
```

### Server Status
```bash
GET /status
```

### Home Page
```bash
GET /
```

## Object Storage Operations

The `ObjectStoreService` class provides methods for interacting with NATS Object Storage:

```javascript
import { ObjectStoreService } from './object-store.js';

const service = new ObjectStoreService(natsServer);

// Store an object
await service.put('mykey', 'Hello World');

// Retrieve an object
const result = await service.get('mykey');
console.log(new TextDecoder().decode(result.data)); // "Hello World"

// List all objects
const objects = await service.list();

// Delete an object
await service.delete('mykey');

// Check if object exists
const exists = await service.exists('mykey');

// Get object metadata
const info = await service.getInfo('mykey');

// Get bucket status
const status = await service.getStatus();
```

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   HTTP Server   │───▶│   NATS Server    │───▶│  Object Store   │
│   (Bun.serve)   │    │   (NATS.js)      │    │  (JetStream)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
    REST API              WebSocket/TCP            File Storage
   - /upload               Connection              - default bucket
   - /list                 - Pub/Sub               - Object metadata
   - /download             - JetStream             - Binary data
   - /delete               - Object Store
   - /status
```

## Configuration

Default configuration can be overridden:

```javascript
const config = {
  nats: {
    servers: ['nats://localhost:4222'],
    name: 'soxdrawer-js-server',
    // Additional NATS connection options
  },
  http: {
    port: 8080,
    host: 'localhost',
    // Additional HTTP server options
  }
};
```

## Development

```bash
# Install dependencies
bun install

# Start in development mode
bun run dev

# Run tests (when available)
bun test
```

## Comparison with Go Version

| Feature | Go Version | JS Version |
|---------|------------|------------|
| NATS JetStream | ✅ | ✅ |
| Object Storage | ✅ | ✅ |
| HTTP REST API | ✅ | ✅ |
| File Upload | ✅ | ✅ |
| File Download | ✅ | ✅ |
| Object Listing | ✅ | ✅ |
| CORS Support | ❌ | ✅ |
| Runtime | Go | Bun/JavaScript |
| Memory Usage | Lower | Higher |
| Startup Time | Faster | Slower |
| Concurrency | Goroutines | Event Loop |

## Troubleshooting

### NATS Connection Issues
- Ensure NATS server is running with JetStream enabled: `nats-server -js`
- Check NATS server logs for connection errors
- Verify NATS_SERVERS environment variable

### Object Store Issues
- Ensure JetStream is enabled on NATS server
- Check NATS server has sufficient disk space
- Verify object store permissions

### HTTP Server Issues
- Check if port is already in use: `lsof -i :8080`
- Verify HTTP_PORT environment variable
- Check firewall settings
