import { useState, useCallback } from 'react'
import { StoredItem } from '../types'
import { apiService } from '../services/api'

export const useApi = () => {
  const [items, setItems] = useState<StoredItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadItems = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const objects = await apiService.listObjects()
      setItems(objects)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load items'
      setError(errorMessage)
      console.error('Failed to load items:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const uploadFile = useCallback(async (file: File) => {
    try {
      setIsUploading(true)
      setError(null)
      const response = await apiService.uploadFile(file)
      if (response.status === 'success' && response.key) {
        await loadItems() // Reload to get updated list
        return { success: true, key: response.key }
      }
      return { success: false, error: response.message }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload file'
      setError(errorMessage)
      console.error('Upload failed:', err)
      return { success: false, error: errorMessage }
    } finally {
      setIsUploading(false)
    }
  }, [loadItems])

  const uploadText = useCallback(async (content: string) => {
    try {
      setIsUploading(true)
      setError(null)
      const response = await apiService.uploadText(content)
      if (response.status === 'success' && response.key) {
        await loadItems() // Reload to get updated list
        return { success: true, key: response.key }
      }
      return { success: false, error: response.message }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload text'
      setError(errorMessage)
      console.error('Failed to upload text:', err)
      return { success: false, error: errorMessage }
    } finally {
      setIsUploading(false)
    }
  }, [loadItems])

  const uploadUrl = useCallback(async (url: string) => {
    try {
      setIsUploading(true)
      setError(null)
      const response = await apiService.uploadUrl(url)
      if (response.status === 'success' && response.key) {
        await loadItems() // Reload to get updated list
        return { success: true, key: response.key }
      }
      return { success: false, error: response.message }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload URL'
      setError(errorMessage)
      console.error('Failed to upload URL:', err)
      return { success: false, error: errorMessage }
    } finally {
      setIsUploading(false)
    }
  }, [loadItems])

  const deleteItem = useCallback(async (id: string) => {
    try {
      setError(null)
      await apiService.deleteObject(id)
      setItems(prev => prev.filter(item => item.id !== id))
      return { success: true }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete item'
      setError(errorMessage)
      console.error('Failed to delete item:', err)
      return { success: false, error: errorMessage }
    }
  }, [])

  const downloadItem = useCallback(async (id: string) => {
    try {
      setError(null)
      const blob = await apiService.downloadObject(id)
      return { success: true, blob }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to download item'
      setError(errorMessage)
      console.error('Failed to download item:', err)
      return { success: false, error: errorMessage }
    }
  }, [])

  const getItemContent = useCallback(async (id: string) => {
    try {
      setError(null)
      const content = await apiService.getObjectContent(id)
      return { success: true, content }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get item content'
      setError(errorMessage)
      console.error('Failed to get item content:', err)
      return { success: false, error: errorMessage }
    }
  }, [])

  return {
    items,
    isLoading,
    isUploading,
    error,
    loadItems,
    uploadFile,
    uploadText,
    uploadUrl,
    deleteItem,
    downloadItem,
    getItemContent,
  }
} 