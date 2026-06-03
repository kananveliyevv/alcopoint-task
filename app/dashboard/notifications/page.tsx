'use client'

import { useNotifications } from '@/lib/hooks/useNotifications'
import { formatDateTime, cn } from '@/lib/utils'
import { NOTIFIKASIYA_LABELS } from '@/lib/constants'
import Link from 'next/link'
import {
  Bell, CheckCheck, BellOff, ExternalLink,
  CheckSquare, RefreshCw, MessageSquare
} from 'lucide-react'

const NOTIF_ICONS = {
  yeni_tapsirig: CheckSquare,
  status_deyisdi: RefreshCw,
  yeni_serh: MessageSquare,
}

const NOTIF_COLORS = {
  yeni_tapsirig: 'bg-blue-100 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400',
  status_deyisdi: 'bg-amber-100 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400',
  yeni_serh: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400',
}

export default function NotificationsPage() {
  const { notifications, loading, unreadCount, markAsRead, markAllAsRead } = useNotifications()

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bildirişlər</h1>
          <p className="text-muted-foreground text-sm">
            {unreadCount > 0 ? `${unreadCount} oxunmamış bildiriş` : 'Bütün bildirişlər oxunub'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors px-3 py-2 rounded-lg hover:bg-primary/10"
          >
            <CheckCheck className="w-4 h-4" />
            Hamısını oxu
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="divide-y divide-border">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-4 p-4">
                <div className="w-10 h-10 rounded-full bg-muted animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                  <div className="h-3 bg-muted animate-pulse rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <BellOff className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="font-medium text-foreground">Bildiriş yoxdur</p>
            <p className="text-muted-foreground text-sm mt-1">Yeni tapşırıq və ya yenilik olduqda burada görünəcək</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map((notif) => {
              const Icon = NOTIF_ICONS[notif.tip]
              const colorClass = NOTIF_COLORS[notif.tip]

              return (
                <div
                  key={notif.id}
                  onClick={() => !notif.oxunub && markAsRead(notif.id)}
                  className={cn(
                    'flex gap-4 p-4 transition-colors cursor-pointer group',
                    !notif.oxunub ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted/50'
                  )}
                >
                  {/* Icon */}
                  <div className={cn('w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0', colorClass)}>
                    <Icon className="w-4 h-4" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">
                          {NOTIFIKASIYA_LABELS[notif.tip]}
                        </p>
                        <p className={cn(
                          'text-sm',
                          !notif.oxunub ? 'text-foreground font-medium' : 'text-foreground/80'
                        )}>
                          {notif.mesaj}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDateTime(notif.yaradilib)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {!notif.oxunub && (
                          <span className="w-2 h-2 bg-primary rounded-full" />
                        )}
                        {notif.task_id && (
                          <Link
                            href={`/dashboard/tasks/${notif.task_id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
