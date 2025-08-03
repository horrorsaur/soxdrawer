# soxdrawer

An in-memory local object store for temporarily holding links/files/etc that you want to revisit later on.

## Architecture

**Blob Storage**
- Golang application
- Embedded NATS Server (~20mb)
- NATS Client in order to communicate to the object store

**Browser interface**
- Embedded HTTP Server
- Frontend will be HTML/CSS/JS or React.

### UX

The main UI will be a drag and drop area where users will be able to drag links/files/pictures/text to.

#### References

- [Object Store NATS](https://docs.nats.io/nats-concepts/jetstream/obj_store)

## Security Implementation

### NATS Token Authentication

SoxDrawer now implements token-based authentication for the NATS server to secure communications between the HTTP server and NATS.

#### Configuration

The application uses a TOML configuration file (`soxdrawer.config.toml`) that contains:

```toml
# SoxDrawer Configuration
# This file contains sensitive authentication tokens - keep it secure!

[nats]
  host = "127.0.0.1"
  port = 4222
  store_dir = "./jetstream"
  token = "your-secure-token-here"

[http]
  address = ":8080"
```

#### Token Management

Use the `nats-client` utility to manage authentication tokens:

```bash
# Generate a new token and save configuration
./bin/nats-client -new-token

# Show current token
./bin/nats-client -show-token

# Display current configuration
./bin/nats-client -show-config

# Test NATS connection (validates config)
./bin/nats-client -test
```

#### Security Features

- **256-bit secure random tokens** generated using cryptographically secure random number generation
- **Configuration file permissions** set to 0600 (owner read/write only)
- **Automatic token generation** if none exists
- **Connection authentication** required for all NATS clients
- **Token isolation** between HTTP server and NATS server

#### Configuration File Security

The configuration file contains sensitive authentication tokens and should be:
- Kept secure with restricted file permissions (0600)
- Not committed to version control (already in .gitignore)
- Backed up securely if needed
- Regenerated periodically for security
