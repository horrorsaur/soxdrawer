# SoxDrawer

A Go application that runs an embedded NATS server with JetStream, Object Store functionality, and an HTTP server for file uploads.

## Features

- Embedded NATS server with JetStream enabled
- NATS Object Store with "default" bucket
- HTTP server with web interface
- File upload endpoint (stubbed)
- Clean separation using internal packages
- Go API for object storage operations
- Graceful shutdown handling

## Architecture

### Internal Packages

- `internal/server/` - NATS server management package
- `internal/store/` - Object store wrapper package
- `internal/httpserver/` - HTTP server with upload functionality
- `main.go` - Application entry point

## Running

```bash
go run main.go
```

The application will start:
- NATS server on `localhost:4222`
- HTTP server on `localhost:8080`

## HTTP Endpoints

### GET /
- **Description**: Index page with upload form
- **Response**: HTML page with file upload interface

### POST /upload
- **Description**: File upload endpoint (currently stubbed)
- **Content-Type**: `multipart/form-data`
- **Response**: JSON status message

## API Usage

### Server Package

```go
import "soxdrawer/internal/server"

// Create and start NATS server
config := server.DefaultConfig()
natsServer, err := server.New(config)
err = natsServer.Start()

// Get connections
conn := natsServer.Connection()
js := natsServer.JetStream()
```

### Store Package

```go
import "soxdrawer/internal/store"

// Create object store (uses "default" bucket)
objectStore, err := store.New(jetStreamContext)

// Store data
info, err := objectStore.PutString("my-key", "my-data")
info, err := objectStore.Put("my-key", []byte("my-data"))

// Retrieve data
data, err := objectStore.GetString("my-key")
bytes, err := objectStore.Get("my-key")

// Check existence
exists, err := objectStore.Exists("my-key")

// Delete object
err = objectStore.Delete("my-key")

// Get store status
status, err := objectStore.Status()
```

### HTTP Server Package

```go
import "soxdrawer/internal/httpserver"

// Create and start HTTP server
config := httpserver.DefaultConfig()
httpServer := httpserver.New(config, objectStore)
err = httpServer.Start()

// Stop server
err = httpServer.Stop(context.Background())
```

## Project Structure

```
soxdrawer/
├── main.go              # Application entry point
├── internal/
│   ├── server/
│   │   └── server.go    # NATS server management
│   ├── store/
│   │   └── store.go     # Object store wrapper
│   └── httpserver/
│       └── httpserver.go # HTTP server with upload
├── jetstream/           # JetStream storage (auto-created)
├── go.mod              # Go module definition
└── README2.md          # This file
```

## Dependencies

- `github.com/nats-io/nats-server/v2` - NATS server
- `github.com/nats-io/nats.go` - NATS Go client
- Standard library `net/http` - HTTP server

## Usage

The application will:
1. Start an embedded NATS server on localhost:4222
2. Enable JetStream with file storage
3. Create a "default" object store bucket
4. Start HTTP server on localhost:8080
5. Serve upload interface at http://localhost:8080/
6. Accept file uploads at http://localhost:8080/upload (stubbed)
7. Run until interrupted with Ctrl+C

All data is persisted in the `./jetstream` directory.

## Web Interface

Visit `http://localhost:8080/` to access the web interface with:
- Welcome page
- File upload form
- Upload functionality (to be implemented)

## Next Steps

The `/upload` endpoint is currently stubbed. Implementation will include:
- Multipart form parsing
- File extraction
- Storage in NATS object store
- Response with file metadata
