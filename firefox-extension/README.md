# SoxDrawer Firefox Extension with Embedded NATS Server

This Firefox extension runs a simplified, in-memory NATS server to handle object storage directly within your browser. It demonstrates how to manage a persistent background service and communicate between the popup and background script.

## Features

- **Embedded NATS Server**: A mock NATS server runs in the background script
- **Object Storage**: In-memory object store for files and data
- **Status Monitoring**: Popup shows the connection status of the NATS server
- **Object Listing**: View a list of all objects stored in the bucket
- **Background Service**: NATS server runs persistently in the background

## Installation (Development)

1. **Open Firefox Developer Tools**
   - Open Firefox and navigate to `about:debugging`
   - Click "This Firefox" in the left sidebar

2. **Load the Extension**
   - Click "Load Temporary Add-on..."
   - Navigate to this directory (`firefox-extension`)
   - Select the `manifest.json` file
   - Click "Open"

3. **Test the Extension**
   - A notification should appear indicating SoxDrawer is ready
   - Click the extension icon in the Firefox toolbar
   - The popup should show "NATS: Connected" status
   - Click "List Objects" to see the default `welcome.txt` file

## Architecture

The extension is built with two main components:

### 1. **Background Script** (`background.js`)
- Runs persistently in the background
- Initializes and manages the `ExtensionNATSClient`
- Listens for messages from the popup (`get_status`, `list_objects`)
- Handles all NATS-related operations
- Stores data in the `MockObjectStore`

### 2. **Popup Script** (`popup.js`)
- User interface for the extension
- Communicates with the background script via messaging
- Displays server status and object list
- Sends requests to the background script for actions

### Communication Flow

```
┌─────────────────┐    ┌────────────────────┐    ┌─────────────────┐
│   Popup (UI)    │───▶│   Message Broker   │───▶│ Background (NATS) │
│  (popup.js)     │    │   (browser.runtime)  │    │  (background.js)  │
└─────────────────┘    └────────────────────┘    └─────────────────┘
                                                            │
                                                            ▼
                                                    ┌───────────────┐
                                                    │ In-Memory DB  │
                                                    │ (Object Store)│
                                                    └───────────────┘
```

## Files

- `manifest.json`: Extension configuration, permissions, and scripts
- `background.js`: Main background script with NATS server logic
- `popup.html`: HTML structure for the popup
- `popup.js`: JavaScript for the popup UI
- `nats-client.js`: Simplified NATS client and mock object store

## Troubleshooting

- **Extension not working**: Check the browser console for errors. Open `about:debugging`, find SoxDrawer, and click "Inspect".
- **Status shows Disconnected**: The background script may have failed to initialize. Check the background script logs.
- **Objects not listing**: Ensure the background script is running and the message passing is working.

## Future Enhancements

This implementation uses a mock NATS server for demonstration. Future improvements could include:
- **Real WebSocket Connection**: Connect to an external NATS server via WebSocket proxy
- **File Upload**: Add functionality to upload files from the popup
- **Persistent Storage**: Use `browser.storage.local` for more durable storage
- **Code Bundling**: Use a bundler like Webpack or Rollup for a cleaner build process
