'use client'

import { useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import { useNotificationSound } from './useNotificationSound'
import { Task } from '@/lib/types'
import { toast } from 'sonner'
import { isToday, isTomorrow, differenceInMinutes, isPast } from 'date-fns'
import { format } from 'date-fns'
import { az } from 'date-fns/locale'

// Göndərilmiş xatırlatmaları yaddaşda saxla (session boyunca)
const sentReminders = new Set<string>()

export function useTaskReminders() {
  const { user } = useAuth()
  const { playSound, playOverdue } = useNotificationSound()
  const supabase = createClient()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const checkReminders = useCallback(async () => {
    if (!user) return

    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, basliq, son_tarix, status, icraci, xatirlatma_vaxt, xatirlatma_aktiv')
      .eq('icraci', user.id)
      .neq('status', 'tamamlanib')
      .not('son_tarix', 'is', null)

    if (!tasks) return

    const now = new Date()

    for (const task of tasks as (Task & { xatirlatma_vaxt?: string; xatirlatma_aktiv?: boolean })[]) {
      if (!task.son_tarix) continue

      const deadline = new Date(task.son_tarix)
      const minutesLeft = differenceInMinutes(deadline, now)

      // --- Gecikmiş tapşırıq bildirişi (hər saat bir dəfə) ---
      if (isPast(deadline) && task.status !== 'tamamlanib') {
        const overdueKey = `overdue-${task.id}-${now.getHours()}`
        if (!sentReminders.has(overdueKey)) {
          sentReminders.add(overdueKey)
          playOverdue()
          toast.error(`⏰ Gecikmiş tapşırıq!`, {
            description: `"${task.basliq}" tapşırığının son tarixi keçib!`,
            duration: 8000,
            action: {
              label: 'Bax',
              onClick: () => window.location.href = `/dashboard/tasks/${task.id}`,
            },
          })
          // Push notification
          sendPushNotification(`⏰ Gecikmiş tapşırıq!`, `"${task.basliq}" tapşırığının son tarixi keçib!`)
        }
        continue
      }

      // --- 1 saat qalmış xəbərdarlıq ---
      if (minutesLeft > 0 && minutesLeft <= 60) {
        const key1h = `1h-${task.id}`
        if (!sentReminders.has(key1h)) {
          sentReminders.add(key1h)
          playSound('xatirlatma')
          toast.warning(`⏳ 1 saat qalıb!`, {
            description: `"${task.basliq}" tapşırığının son tarixi ${format(deadline, 'HH:mm', { locale: az })}-də bitir`,
            duration: 10000,
            action: {
              label: 'Bax',
              onClick: () => window.location.href = `/dashboard/tasks/${task.id}`,
            },
          })
          sendPushNotification(`⏳ 1 saat qalıb!`, `"${task.basliq}" tapşırığı üçün son tarix yaxınlaşır`)
        }
      }

      // --- 24 saat qalmış xəbərdarlıq ---
      if (minutesLeft > 60 && minutesLeft <= 1440) {
        const key24h = `24h-${task.id}`
        if (!sentReminders.has(key24h)) {
          sentReminders.add(key24h)
          playSound('xatirlatma')
          toast.warning(`📅 Bu gün bitir!`, {
            description: `"${task.basliq}" bu gün ${format(deadline, 'HH:mm', { locale: az })}-də tamamlanmalıdır`,
            duration: 8000,
            action: {
              label: 'Bax',
              onClick: () => window.location.href = `/dashboard/tasks/${task.id}`,
            },
          })
          sendPushNotification(`📅 Bu gün bitir!`, `"${task.basliq}" bu gün tamamlanmalıdır`)
        }
      }

      // --- Xüsusi xatırlatma vaxtı (əgər task-da varsa) ---
      if (task.xatirlatma_aktiv && task.xatirlatma_vaxt) {
        const reminderTime = new Date(task.xatirlatma_vaxt)
        const diffMins = Math.abs(differenceInMinutes(reminderTime, now))
        if (diffMins <= 1) {
          const customKey = `custom-${task.id}-${format(reminderTime, 'HH:mm')}`
          if (!sentReminders.has(customKey)) {
            sentReminders.add(customKey)
            playSound('xatirlatma')
            toast.info(`🔔 Xatırlatma!`, {
              description: `"${task.basliq}" tapşırığı üçün xatırlatma vaxtıdır`,
              duration: 12000,
              action: {
                label: 'Bax',
                onClick: () => window.location.href = `/dashboard/tasks/${task.id}`,
              },
            })
            sendPushNotification(`🔔 Xatırlatma!`, `"${task.basliq}" tapşırığı üçün xatırlatma vaxtıdır`)
          }
        }
      }
    }
  }, [user, supabase, playSound, playOverdue])

  useEffect(() => {
    if (!user) return

    // İlk yoxlama
    checkReminders()

    // Hər dəqiqə yoxla
    intervalRef.current = setInterval(checkReminders, 60 * 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [user, checkReminders])
}

// Browser Push Notification göndər
async function sendPushNotification(title: string, body: string) {
  if (!('Notification' in window)) return
  if (Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
    })
  } else if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission()
    if (permission === 'granted') {
      new Notification(title, { body, icon: '/favicon.ico' })
    }
  }
}

export { sendPushNotification }
