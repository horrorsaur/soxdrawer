# SoxDrawer Firefox Extension

A Firefox extension that integrates with the SoxDrawer application, allowing you to easily save files, text, and links from any webpage to your personal SoxDrawer storage.

## Features

- **Drag & Drop Support**: Drop files, text, or links directly from web pages to SoxDrawer
- **Floating Button**: Quick access button on every webpage for easy uploads
- **Popup Interface**: Clean, modern interface to view and manage your stored items
- **File Upload**: Upload files directly from the extension popup
- **Item Management**: View, download, and delete stored items
- **Real-time Updates**: Automatic refresh of stored items

## Installation

### Method 1: Load as Temporary Extension (Development)

1. Open Firefox and navigate to `about:debugging`
2. Click on "This Firefox" in the sidebar
3. Click "Load Temporary Add-on..."
4. Select the `manifest.json` file from the `firefox-extension` directory
5. The extension will be installed and ready to use

### Method 2: Build and Install

1. Navigate to the `firefox-extension` directory
2. Zip all files in the directory:
   ```bash
   cd firefox-extension
   zip -r soxdrawer-extension.zip . -x "*.DS_Store" "*.git*"
   ```
3. Open Firefox and go to `about:addons`
4. Click the gear icon and select "Install Add-on From File..."
5. Select the `soxdrawer-extension.zip` file

## Configuration

### Setting SoxDrawer URL

By default, the extension connects to `http://localhost:8080`. To change this:

1. Open the extension popup by clicking the SoxDrawer icon in the toolbar
2. The extension will automatically use the configured SoxDrawer URL
3. Make sure your SoxDrawer server is running and accessible

## Usage

### Using the Floating Button

1. Navigate to any webpage
2. Look for the floating blue folder icon (📁) in the top-right corner
3. Click the icon to open the SoxDrawer popup
4. Use the popup to upload files or view stored items

### Drag & Drop from Web Pages

1. Select any text, image, or file on a webpage
2. Drag the selected content to anywhere on the page
3. The content will be automatically uploaded to SoxDrawer
4. A notification will appear confirming the upload

### Using the Extension Popup

1. Click the SoxDrawer icon in the Firefox toolbar
2. The popup will open showing your stored items
3. Use the upload zone to add new files
4. Click the refresh button to reload items
5. Use the action buttons to download or delete items

## Features in Detail

### Content Script Features

- **Floating Button**: Always-visible button on every webpage
- **Drag & Drop Detection**: Captures drag events from any webpage
- **Visual Feedback**: Shows drag-over effects when content is being dragged
- **Automatic Upload**: Automatically uploads dropped content to SoxDrawer
- **Notifications**: Shows success/error notifications for uploads

### Popup Features

- **Modern UI**: Clean, responsive design with smooth animations
- **File Upload**: Drag & drop or click to browse files
- **Item List**: View all stored items with metadata
- **Item Actions**: Download or delete individual items
- **Real-time Updates**: Automatic refresh of stored items
- **Error Handling**: Clear error messages and retry options

### Background Script Features

- **Message Handling**: Processes messages from content scripts
- **Upload Management**: Handles file uploads to SoxDrawer
- **Configuration**: Manages SoxDrawer URL configuration
- **Extension Lifecycle**: Handles installation and initialization

## File Structure

```
firefox-extension/
├── manifest.json          # Extension manifest
├── background.js          # Background script
├── content.js            # Content script for web pages
├── popup.html            # Popup HTML
├── popup.js              # Popup JavaScript (React-like)
├── popup.css             # Popup styles
├── icons/                # Extension icons
│   ├── icon-16.png
│   ├── icon-32.png
│   ├── icon-48.png
│   └── icon-128.png
└── README.md             # This file
```

## API Integration

The extension integrates with the SoxDrawer API endpoints:

- `GET /api/list?json=true` - List stored items
- `POST /api/upload` - Upload files/text/URLs
- `DELETE /api/delete/{key}` - Delete items
- `GET /api/download/{key}` - Download items

## Development

### Making Changes

1. Edit the relevant files in the `firefox-extension` directory
2. Reload the extension in `about:debugging`
3. Test your changes

### Building for Production

1. Update the version in `manifest.json`
2. Create a zip file of the extension
3. Sign the extension for Firefox Add-ons (optional)

## Troubleshooting

### Extension Not Working

1. Check that SoxDrawer server is running
2. Verify the SoxDrawer URL in extension storage
3. Check browser console for error messages
4. Ensure the extension has necessary permissions

### Upload Failures

1. Check network connectivity to SoxDrawer
2. Verify SoxDrawer server is accessible
3. Check browser console for API errors
4. Ensure file size is within limits

### Floating Button Not Visible

1. Refresh the webpage
2. Check if content script is loaded (browser console)
3. Verify extension is enabled
4. Check for JavaScript errors on the page

## Security

- The extension only requests necessary permissions
- Content scripts are isolated from webpage JavaScript
- API calls use HTTPS when available
- No sensitive data is stored in extension storage

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This extension is part of the SoxDrawer project and follows the same license terms. 