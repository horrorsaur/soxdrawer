# SoxDrawer Firefox Extension

A Firefox extension for the SoxDrawer NATS-powered object storage service.

## Installation (Development)

1. **Open Firefox Developer Tools**
   - Open Firefox
   - Navigate to `about:debugging`
   - Click "This Firefox" in the left sidebar

2. **Load the Extension**
   - Click "Load Temporary Add-on..."
   - Navigate to this directory (`firefox-extension`)
   - Select the `manifest.json` file
   - Click "Open"

3. **Test the Extension**
   - You should see the SoxDrawer extension appear in your extensions list
   - Click the extension icon in the Firefox toolbar (or use Ctrl+Shift+A to open Add-ons Manager)
   - The popup should appear with "Hello World!" message

## Features

- **Hello World Popup**: Basic popup interface showing welcome message
- **Server Connection Test**: Button to test connection to SoxDrawer server on localhost:8080
- **Background Script**: Handles extension lifecycle events

## Development

The extension consists of:

- `manifest.json` - Extension configuration
- `popup.html` - Popup interface HTML
- `popup.js` - Popup interface JavaScript
- `background.js` - Background script for extension lifecycle

## Testing

1. Make sure your SoxDrawer server is running on `localhost:8080`
2. Load the extension as described above
3. Click the extension icon and try the "Test Connection" button
4. Check the browser console for debug messages

## Next Steps

This is a basic "Hello World" extension. Future enhancements will include:
- File upload functionality
- Object listing and management
- Integration with SoxDrawer server APIs
