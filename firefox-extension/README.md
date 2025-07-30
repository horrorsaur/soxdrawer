# SoxDrawer Firefox Extension

A Firefox extension that connects to the SoxDrawer Go server for NATS-powered object storage.

## Prerequisites

1. **SoxDrawer Go Server**: The extension requires the SoxDrawer Go server to be running
2. **Firefox Developer Edition or Nightly**: For loading temporary extensions

### Starting the SoxDrawer Go Server

First, make sure you have a NATS server running with JetStream:

```bash
# Install NATS server if you don't have it
# Download from https://github.com/nats-io/nats-server/releases

# Start NATS with JetStream
nats-server -js
```

Then start the SoxDrawer Go server:

```bash
# Navigate to the main project directory
cd ../

# Build and run the SoxDrawer server
go build .
./soxdrawer
```

The server should start on `http://localhost:8080`

## Firefox Extension Installation

1. **Open Firefox Developer Tools**
   - Open Firefox and navigate to `about:debugging`
   - Click "This Firefox" in the left sidebar

2. **Load the Extension**
   - Click "Load Temporary Add-on..."
   - Navigate to this directory (`firefox-extension`)
   - Select the `manifest.json` file
   - Click "Open"

3. **Test the Extension**
   - Click the SoxDrawer extension icon in the Firefox toolbar
   - The popup should show "Server: Connected" if the Go server is running
   - You can now upload files, list objects, and delete files

## Features

### ✅ **Server Connection**
- Connects to SoxDrawer Go server via HTTP REST API
- Real-time connection status monitoring
- Automatic reconnection attempts

### ✅ **File Upload**
- Upload any file type through the extension popup
- Files are sent to the Go server's `/upload` endpoint
- Automatic filename sanitization and unique key generation

### ✅ **Object Management**
- List all objects stored in the NATS ObjectStore
- View file details (name, size, creation date)
- Delete objects with confirmation dialog

### ✅ **User Interface**
- Modern, responsive popup design
- Real-time status indicators
- Error handling and user feedback
- Clean object listing with actions

## Architecture

```
┌─────────────────┐    ┌─────────────────────┐    ┌──────────────────┐
│   Firefox       │    │   HTTP REST API     │    │  SoxDrawer Go    │
│   Extension     │◄──►│   (fetch/xhr)       │◄──►│     Server       │
│                 │    │                     │    │                  │
│ • Popup UI      │    │ GET  /list          │    │ • NATS Client    │
│ • Background    │    │ POST /upload        │    │ • JetStream      │
│ • File Mgmt     │    │ GET  /download/:key │    │ • ObjectStore    │
│                 │    │ DELETE /delete/:key │    │ • HTTP Server    │
└─────────────────┘    └─────────────────────┘    └──────────────────┘
```

## API Endpoints Used

The extension communicates with these Go server endpoints:

- **`GET /`**: Server health check
- **`POST /upload`**: Upload files (multipart/form-data)
- **`GET /list`**: List all objects in JSON format
- **`DELETE /delete/:key`**: Delete a specific object
- **`GET /download/:key`**: Download an object (for future use)

## Permissions

The extension uses these Firefox permissions:

- **`storage`**: For local state management
- **`notifications`**: For user notifications
- **`http://localhost:8080/*`**: To communicate with the local Go server
- **`http://127.0.0.1:8080/*`**: Alternative localhost access

## Development

### File Structure
```
firefox-extension/
├── manifest.json          # Extension configuration
├── background.js          # Background script (NATS client management)
├── popup.html            # Extension popup UI
├── popup.js              # Popup logic and API calls
├── nats-client.js        # HTTP client for Go server communication
└── README.md             # This file
```

### Debugging

1. **Background Script**: In `about:debugging`, click "Inspect" next to the SoxDrawer extension
2. **Popup Script**: Right-click on the extension popup and select "Inspect Element"
3. **Server Logs**: Check the Go server console for request logs
4. **NATS Logs**: Check the NATS server logs for storage operations

### Common Issues

**"Server: Disconnected"**
- Ensure the Go server is running on `http://localhost:8080`
- Check the Go server logs for errors
- Verify NATS server is running with JetStream enabled

**"Upload Failed"**
- Check browser console for detailed error messages
- Ensure the file isn't too large (default limit depends on Go server config)
- Verify the Go server `/upload` endpoint is responding

**"Permission Denied"**
- Firefox may block localhost connections - check Firefox settings
- Ensure the manifest.json permissions are properly configured

## Future Enhancements

- **Download Files**: Add download functionality to the popup
- **Drag & Drop**: Support drag-and-drop file uploads
- **Bulk Operations**: Select and delete multiple files
- **Search & Filter**: Find files by name or type
- **Settings Panel**: Configure server URL and connection options
- **File Preview**: Show thumbnails or preview small text files

## Security Notes

- The extension only connects to localhost (127.0.0.1 and localhost)
- All communication is over HTTP (consider HTTPS for production)
- Files are stored in NATS JetStream ObjectStore on the local server
- No data is sent to external servers
