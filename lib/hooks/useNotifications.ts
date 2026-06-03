'use client'

import { useState, useCallback } from 'react'

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'default'
  )

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return 'denied' as NotificationPermission
    const result = await Notification.requestPermission()
    setPermission(result)
    return result
  }, [])

  const sendNotification = useCallback(
    (title: string, options?: NotificationOptions) => {
      if (permission !== 'granted') return
      if (!('Notification' in window)) return
      new Notification(title, options)
    },
    [permission]
  )

  return { permission, requestPermission, sendNotification }
}
