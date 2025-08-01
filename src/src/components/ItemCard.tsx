import React from 'react'
import { Link, FileText, Image, Trash2, Copy, ExternalLink, Download, Clock } from 'lucide-react'
import { StoredItem } from '../types'

interface ItemCardProps {
  item: StoredItem
  onDelete: (id: string) => void
  onCopy: (content: string) => void
}

export const ItemCard: React.FC<ItemCardProps> = ({ item, onDelete, onCopy }) => {
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
    <div className="item-card">
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
            onClick={() => onCopy(item.content)}
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
              title="Open link"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
          
          <button
            onClick={() => onDelete(item.id)}
            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
            title="Delete item"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
} 