import { useState, useEffect } from 'react'
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'
import { useDropzone } from 'react-dropzone'
import { 
  Upload, 
  Link, 
  FileText, 
  Image, 
  Trash2, 
  Copy, 
  ExternalLink,
  Download,
  Clock,
  RefreshCw,
  LogOut
} from 'lucide-react'
import clsx from 'clsx'
import { useApi } from './hooks/useApi'

function App() {
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const {
    items,
    isLoading,
    isUploading,
    error,
    loadItems,
    uploadFile,
    uploadText,
    uploadUrl,
    deleteItem,
  } = useApi()

  // Load items from API on mount
  useEffect(() => {
    loadItems()
  }, [loadItems])

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (response.ok) {
        window.location.href = '/login'
      } else {
        showNotification('Failed to logout', 'error')
      }
    } catch (error) {
      showNotification('Network error during logout', 'error')
    }
  }

  const handleDrop = async (acceptedFiles: File[]) => {
    let successCount = 0
    
    for (const file of acceptedFiles) {
      const result = await uploadFile(file)
      if (result.success) {
        successCount++
      }
    }
    
    if (successCount > 0) {
      showNotification(`Added ${successCount} item(s)`, 'success')
    } else {
      showNotification('Failed to upload items', 'error')
    }
  }

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop: handleDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'text/*': ['.txt', '.md', '.json', '.csv'],
      'application/pdf': ['.pdf'],
      'application/zip': ['.zip', '.rar', '.7z']
    },
    multiple: true
  })

  const handleTextDrop = async (text: string) => {
    const result = await uploadText(text)
    if (result.success) {
      showNotification('Text added to drawer', 'success')
    } else {
      showNotification('Failed to add text', 'error')
    }
  }

  const handleLinkDrop = async (url: string) => {
    const result = await uploadUrl(url)
    if (result.success) {
      showNotification('Link added to drawer', 'success')
    } else {
      showNotification('Failed to add link', 'error')
    }
  }

  const handleDragEnd = (result: any) => {
    if (!result.destination) return

    // Note: Reordering is handled client-side for now
    // In a real app, you might want to persist the order to the server
    console.log('Item reordered:', result)
  }

  const handleDeleteItem = async (id: string) => {
    const result = await deleteItem(id)
    if (result.success) {
      showNotification('Item removed', 'success')
    } else {
      showNotification('Failed to delete item', 'error')
    }
  }

  const copyToClipboard = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      showNotification('Copied to clipboard', 'success')
    } catch (error) {
      showNotification('Failed to copy', 'error')
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatTimestamp = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'link': return <Link className="w-5 h-5" />
      case 'text': return <FileText className="w-5 h-5" />
      case 'image': return <Image className="w-5 h-5" />
      default: return <Download className="w-5 h-5" />
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">SoxDrawer</h1>
              <p className="text-gray-600">Your personal drag & drop object store</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={loadItems}
                disabled={isLoading}
                className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
              <div className="text-sm text-gray-500">
                {items.length} item{items.length !== 1 ? 's' : ''} stored
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-red-600 transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Drag & Drop Zone */}
        <div className="mb-8">
          <div
            {...getRootProps()}
            className={clsx(
              'drag-zone cursor-pointer',
              isDragActive && 'active',
              isDragReject && 'border-red-500 bg-red-50'
            )}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <div className="text-lg font-medium text-gray-900 mb-2">
              {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
            </div>
            <p className="text-gray-600">
              Or click to browse files. Supports images, documents, and more.
            </p>
            {isUploading && (
              <div className="mt-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto"></div>
                <p className="text-sm text-gray-500 mt-2">Uploading...</p>
              </div>
            )}
          </div>
        </div>

        {/* Text and Link Input */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Add Text</h3>
            <textarea
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Paste or type text here..."
              rows={3}
              onPaste={(e) => {
                const text = e.clipboardData.getData('text')
                if (text) {
                  handleTextDrop(text)
                  e.currentTarget.value = ''
                }
              }}
            />
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Add Link</h3>
            <div className="flex">
              <input
                type="url"
                className="flex-1 p-3 border border-gray-300 rounded-l-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Paste URL here..."
                onPaste={(e) => {
                  const url = e.clipboardData.getData('text')
                  if (url && url.startsWith('http')) {
                    handleLinkDrop(url)
                    e.currentTarget.value = ''
                  }
                }}
              />
              <button
                className="px-4 py-3 bg-primary-600 text-white rounded-r-md hover:bg-primary-700 transition-colors"
                onClick={() => {
                  const input = document.querySelector('input[type="url"]') as HTMLInputElement
                  if (input?.value && input.value.startsWith('http')) {
                    handleLinkDrop(input.value)
                    input.value = ''
                  }
                }}
              >
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Connection Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                  <button
                    onClick={loadItems}
                    className="mt-2 text-red-800 underline hover:text-red-900"
                  >
                    Try again
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading items...</p>
          </div>
        )}

        {/* Items List */}
        {!isLoading && items.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Stored Items</h2>
            </div>
            
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="items">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="divide-y divide-gray-200"
                  >
                    {items.map((item, index) => (
                      <Draggable key={item.id} draggableId={item.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={clsx(
                              'item-card',
                              snapshot.isDragging && 'shadow-lg rotate-2'
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <div className="text-primary-600">
                                  {getItemIcon(item.type)}
                                </div>
                                <div className="flex-1">
                                  <h3 className="font-medium text-gray-900 truncate">
                                    {item.name}
                                  </h3>
                                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                                    <span className="flex items-center">
                                      <Clock className="w-4 h-4 mr-1" />
                                      {formatTimestamp(item.timestamp)}
                                    </span>
                                    {item.size && (
                                      <span>{formatFileSize(item.size)}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => copyToClipboard(item.content)}
                                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                                  title="Copy to clipboard"
                                >
                                  <Copy className="w-4 h-4" />
                                </button>
                                
                                {item.url && (
                                  <a
                                    href={item.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                                    title="Download file"
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                  </a>
                                )}
                                
                                <button
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                                  title="Delete item"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && items.length === 0 && (
          <div className="text-center py-12">
            <Upload className="mx-auto h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No items yet</h3>
            <p className="text-gray-600">Start by dragging files, text, or links into the drop zone above.</p>
          </div>
        )}
      </div>

      {/* Notification */}
      {notification && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className={clsx(
            'px-4 py-3 rounded-lg shadow-lg text-white',
            notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          )}>
            {notification.message}
          </div>
        </div>
      )}
    </div>
  )
}

export default App 
