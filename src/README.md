# SoxDrawer Frontend

A modern React frontend for SoxDrawer - a drag and drop object store application.

## Features

- **Drag & Drop Interface**: Intuitive drag and drop functionality for files, text, and links
- **File Support**: Images, documents, PDFs, and archives
- **Quick Add**: Text and link input areas for quick content addition
- **Item Management**: Reorder, copy, and delete stored items
- **Responsive Design**: Beautiful UI that works on all devices
- **Local Storage**: Items persist between sessions
- **Real-time Feedback**: Notifications and visual feedback for all actions

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **react-dropzone** for file drag and drop
- **react-beautiful-dnd** for item reordering
- **Lucide React** for icons
- **clsx** for conditional styling

## Getting Started

### Prerequisites

- Node.js 16+ 
- npm or yarn

### Installation

1. Navigate to the src directory:
   ```bash
   cd src
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:3000`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Project Structure

```
src/
├── src/
│   ├── components/          # Reusable React components
│   │   ├── DragDropZone.tsx
│   │   ├── ItemCard.tsx
│   │   └── Notification.tsx
│   ├── hooks/              # Custom React hooks
│   │   └── useLocalStorage.ts
│   ├── utils/              # Utility functions
│   │   └── fileUtils.ts
│   ├── types.ts            # TypeScript type definitions
│   ├── App.tsx             # Main application component
│   ├── main.tsx            # Application entry point
│   └── index.css           # Global styles
├── index.html              # HTML template
├── package.json            # Dependencies and scripts
├── vite.config.ts          # Vite configuration
├── tailwind.config.js      # Tailwind CSS configuration
└── tsconfig.json           # TypeScript configuration
```

## Usage

### Adding Files
- Drag and drop files directly onto the drop zone
- Click the drop zone to browse and select files
- Supported formats: images, documents, PDFs, archives

### Adding Text
- Paste text into the "Quick Add Text" textarea
- Text is automatically added to the drawer

### Adding Links
- Paste URLs into the "Quick Add Link" input
- Click "Add" or press Enter to add the link

### Managing Items
- Drag items to reorder them in the list
- Click the copy icon to copy item content to clipboard
- Click the external link icon to open links in a new tab
- Click the trash icon to delete items

## Development

### Adding New Features

1. Create new components in `src/components/`
2. Add custom hooks in `src/hooks/`
3. Add utility functions in `src/utils/`
4. Update types in `src/types.ts`

### Styling

The application uses Tailwind CSS for styling. Custom styles can be added to:
- `src/index.css` for global styles
- Component files for component-specific styles

### State Management

The application uses React's built-in state management with:
- `useState` for local component state
- `useLocalStorage` hook for persistent storage
- Props for component communication

## API Integration

The frontend is configured to proxy API requests to the Go backend at `http://localhost:8080`. To integrate with the backend:

1. Update the proxy configuration in `vite.config.ts`
2. Create API service functions
3. Replace localStorage with API calls

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is part of the SoxDrawer application. 