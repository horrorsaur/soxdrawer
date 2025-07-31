# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SoxDrawer is an in-memory object storage service with a drag-and-drop web interface. It combines:
- **Go backend**: NATS-powered object storage with embedded HTTP server
- **Firefox extension**: Browser integration for storing links/files
- **Template-based frontend**: Using templ for server-side rendering

## Development Commands

### Build & Run
```bash
make dev              # Generate templates and run with go run
make build            # Generate templates and build binary
make build-windows    # Cross-compile for Windows
make clean            # Remove binary and generated template files
```

### Template Generation
```bash
make generate         # Generate Go code from .templ files
```
Note: Uses `/home/garyhost/go/bin/templ` - adjust path if needed.

## Architecture

### Core Components
- **main.go**: Application entry point, orchestrates NATS and HTTP servers
- **internal/nats/**: Embedded NATS server with JetStream for object storage
- **internal/http/**: HTTP server with upload/list endpoints and CORS middleware
- **internal/store/**: Object storage abstraction over NATS JetStream
- **internal/templates/**: templ-based HTML templates (generates *_templ.go files)

### Browser Extension
- **firefox-extension/**: Manifest v3 extension with sidebar interface
- Connects to localhost:8080 for API communication
- Uses storage and notifications permissions

### Key Dependencies
- **NATS**: Embedded server and client for object storage
- **templ**: Template engine for server-side rendering
- **Go 1.24.4**: Required version

### Data Flow
1. NATS server starts with JetStream enabled
2. Object store created using JetStream context
3. HTTP server provides REST API and web interface
4. Firefox extension communicates via localhost:8080

### Configuration
- NATS server: 127.0.0.1:4222, JetStream store in ./jetstream/
- HTTP server: :8080 with CORS enabled
- Default 32MB file upload limit

## Development Environment

Uses Nix flake with go, bun, and templ in development shell.