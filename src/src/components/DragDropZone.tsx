import React from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload } from 'lucide-react'
import clsx from 'clsx'

interface DragDropZoneProps {
  onDrop: (acceptedFiles: File[]) => void
  isUploading?: boolean
  className?: string
}

export const DragDropZone: React.FC<DragDropZoneProps> = ({
  onDrop,
  isUploading = false,
  className = ''
}) => {
  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'text/*': ['.txt', '.md', '.json', '.csv'],
      'application/pdf': ['.pdf'],
      'application/zip': ['.zip', '.rar', '.7z']
    },
    multiple: true
  })

  return (
    <div
      {...getRootProps()}
      className={clsx(
        'drag-zone cursor-pointer',
        isDragActive && 'active',
        isDragReject && 'border-red-500 bg-red-50',
        className
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
  )
} 