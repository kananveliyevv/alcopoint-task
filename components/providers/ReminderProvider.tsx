'use client'

import { useTaskReminders } from '@/lib/hooks/useTaskReminders'
import { NotificationPermissionBanner } from '@/components/layout/NotificationPermissionBanner'

export function ReminderProvider({ children }: { children: React.ReactNode }) {
  // Hook-u burada çağırırıq — dashboard-da aktiv olur
  useTaskReminders()

  return (
    <>
      {children}
      <NotificationPermissionBanner />
    </>
  )
}
