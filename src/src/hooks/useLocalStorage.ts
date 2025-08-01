import { useState } from 'react'
import { StoredItem } from '../types'

export const useLocalStorage = (key: string, initialValue: StoredItem[]) => {
  const [storedValue, setStoredValue] = useState<StoredItem[]>(() => {
    try {
      const item = window.localStorage.getItem(key)
      if (item) {
        const parsedItems = JSON.parse(item).map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        }))
        return parsedItems
      }
      return initialValue
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error)
      return initialValue
    }
  })

  const setValue = (value: StoredItem[] | ((val: StoredItem[]) => StoredItem[])) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value
      setStoredValue(valueToStore)
      window.localStorage.setItem(key, JSON.stringify(valueToStore))
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error)
    }
  }

  return [storedValue, setValue] as const
} 