import React from 'react'
import clsx from 'clsx'
import { Notification as NotificationType } from '../types'

interface NotificationProps {
  notification: NotificationType | null
}

export const Notification: React.FC<NotificationProps> = ({ notification }) => {
  if (!notification) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-fade-in">
      <div className={clsx(
        'px-4 py-3 rounded-lg shadow-lg text-white',
        notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'
      )}>
        {notification.message}
      </div>
    </div>
  )
} 