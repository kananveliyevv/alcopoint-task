'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'
import { useNotifications } from '@/lib/hooks/useNotifications'
import { Task } from '@/lib/types'

const CHECK_INTERVAL_MS = 60_000 // 1 dəqiqə

export function useTaskReminders() {
  const { user } = useAuth()
  const { permission, sendNotification } = useNotifications()
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (!user || permission !== 'granted') return

    const check = async () => {
      const now = new Date()
      const soon = new Date(now.getTime() + CHECK_INTERVAL_MS)

      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, basliq, son_tarix, xatirlatma_aktiv, xatirlatma_vaxt')
        .eq('icraci', user.id)
        .eq('xatirlatma_aktiv', true)
        .neq('status', 'tamamlanib')
        .gte('xatirlatma_vaxt', now.toISOString())
        .lte('xatirlatma_vaxt', soon.toISOString())

      if (tasks) {
        tasks.forEach((task: Partial<Task> & { xatirlatma_vaxt?: string; xatirlatma_aktiv?: boolean }) => {
          sendNotification(`⏰ Xatırlatma: ${task.basliq}`, {
            body: task.son_tarix
              ? `Son tarix: ${new Date(task.son_tarix).toLocaleDateString('az')}`
              : 'Tapşırıq xatırlatması',
            icon: '/favicon.ico',
          })
        })
      }
    }

    check()
    timerRef.current = setInterval(check, CHECK_INTERVAL_MS)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [user, permission, supabase, sendNotification])
}
