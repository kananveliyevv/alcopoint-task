'use client'

import { createClient } from '@/lib/supabase/client'
import { Notification } from '@/lib/types'
import { useEffect, useState, useCallback } from 'react'
import { useAuth } from './useAuth'
import { useNotificationSound } from './useNotificationSound'
import { toast } from 'sonner'
import { sendPushNotification } from './useTaskReminders'

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)
  const { user } = useAuth()
  const { playSound } = useNotificationSound()
  const supabase = createClient()

  const fetchNotifications = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('yaradilib', { ascending: false })
      .limit(50)
    if (data) setNotifications(data as Notification[])
    setLoading(false)
    setInitialized(true)
  }, [user, supabase])

  useEffect(() => {
    fetchNotifications()

    if (!user) return

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotif = payload.new as Notification

          if (initialized) {
            playSound(newNotif.tip)

            const toastConfig = {
              description: newNotif.mesaj,
              duration: 6000,
              action: newNotif.task_id ? {
                label: 'Bax',
                onClick: () => window.location.href = `/dashboard/tasks/${newNotif.task_id}`,
              } : undefined,
            }

            switch (newNotif.tip) {
              case 'yeni_tapsirig':
                toast.info('📋 Yeni tapşırıq!', toastConfig)
                sendPushNotification('📋 Yeni tapşırıq!', newNotif.mesaj)
                break
              case 'status_deyisdi':
                toast.success('✅ Status dəyişdi', toastConfig)
                sendPushNotification('✅ Status dəyişdi', newNotif.mesaj)
                break
              case 'yeni_serh':
                toast.info('💬 Yeni şərh', toastConfig)
                sendPushNotification('💬 Yeni şərh', newNotif.mesaj)
                break
            }
          }

          setNotifications((prev) => [newNotif, ...prev])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, fetchNotifications, initialized, playSound, supabase])

  const markAsRead = async (id: string) => {
    await supabase
      .from('notifications')
      .update({ oxunub: true })
      .eq('id', id)
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, oxunub: true } : n))
    )
  }

  const markAllAsRead = async () => {
    if (!user) return
    await supabase
      .from('notifications')
      .update({ oxunub: true })
      .eq('user_id', user.id)
      .eq('oxunub', false)
    setNotifications((prev) => prev.map((n) => ({ ...n, oxunub: true })))
  }

  const unreadCount = notifications.filter((n) => !n.oxunub).length

  return {
    notifications,
    loading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications,
  }
}
