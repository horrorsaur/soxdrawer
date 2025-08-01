import { StoredItem } from '../types'

// API Response types
interface UploadResponse {
  status: string
  message: string
  key?: string
  size?: number
  filename?: string
}

interface ListResponse {
  status: string
  message: string
  objects?: Array<{
    name: string
    size: number
    created: string
  }>
}

interface ApiError {
  status: string
  message: string
}

class ApiService {
  private baseUrl: string

  constructor() {
    this.baseUrl = '/api'
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })

    if (!response.ok) {
      const errorData: ApiError = await response.json().catch(() => ({
        status: 'error',
        message: `HTTP ${response.status}: ${response.statusText}`,
      }))
      throw new Error(errorData.message)
    }

    return response.json()
  }

  // Upload a file
  async uploadFile(file: File, type: 'file' | 'text' | 'url' = 'file'): Promise<UploadResponse> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', type)

    const response = await fetch(`${this.baseUrl}/upload`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const errorData: ApiError = await response.json().catch(() => ({
        status: 'error',
        message: `HTTP ${response.status}: ${response.statusText}`,
      }))
      throw new Error(errorData.message)
    }

    return response.json()
  }

  // Upload text content
  async uploadText(content: string): Promise<UploadResponse> {
    const blob = new Blob([content], { type: 'text/plain' })
    const file = new File([blob], 'text.txt', { type: 'text/plain' })
    return this.uploadFile(file, 'text')
  }

  // Upload URL
  async uploadUrl(url: string): Promise<UploadResponse> {
    const blob = new Blob([url], { type: 'text/plain' })
    const file = new File([blob], 'url.txt', { type: 'text/plain' })
    return this.uploadFile(file, 'url')
  }

  // List all objects
  async listObjects(): Promise<StoredItem[]> {
    const response: ListResponse = await this.request('/list?json=true')
    
    if (response.status !== 'success' || !response.objects) {
      throw new Error(response.message || 'Failed to list objects')
    }

    return response.objects.map(obj => ({
      id: obj.name,
      type: this.determineType(obj.name),
      name: obj.name,
      content: obj.name, // We'll need to fetch content separately if needed
      size: obj.size,
      timestamp: new Date(obj.created),
      url: `/api/download/${obj.name}`,
    }))
  }

  // Delete an object
  async deleteObject(key: string): Promise<void> {
    await this.request(`/delete/${key}`, {
      method: 'DELETE',
    })
  }

  // Download an object
  async downloadObject(key: string): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/download/${key}`)
    
    if (!response.ok) {
      throw new Error(`Failed to download object: ${response.statusText}`)
    }

    return response.blob()
  }

  // Get object content as text
  async getObjectContent(key: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/preview/${key}`)
    
    if (!response.ok) {
      throw new Error(`Failed to get object content: ${response.statusText}`)
    }

    return response.text()
  }

  // Determine the type of object based on filename
  private determineType(filename: string): 'file' | 'link' | 'text' | 'image' {
    const ext = filename.toLowerCase().split('.').pop()
    
    if (ext === 'txt') {
      // Check if it's a URL by reading content (we'll assume it's text for now)
      return 'text'
    }
    
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp']
    if (imageExts.includes(ext || '')) {
      return 'image'
    }
    
    return 'file'
  }

  // Get object info
  async getObjectInfo(key: string): Promise<StoredItem | null> {
    try {
      const objects = await this.listObjects()
      return objects.find(obj => obj.id === key) || null
    } catch (error) {
      console.error('Failed to get object info:', error)
      return null
    }
  }
}

export const apiService = new ApiService() 