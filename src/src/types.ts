export interface StoredItem {
  id: string
  type: 'file' | 'link' | 'text' | 'image'
  name: string
  content: string
  size?: number
  timestamp: Date
  url?: string
}

export interface Notification {
  message: string
  type: 'success' | 'error'
}

export interface DragDropResult {
  draggableId: string
  type: string
  source: {
    index: number
    droppableId: string
  }
  destination?: {
    index: number
    droppableId: string
  }
} 