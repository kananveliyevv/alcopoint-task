'use client'

import { useEffect, useState } from 'react'
import { Bell, X, Check } from 'lucide-react'

export function NotificationPermissionBanner() {
  const [show, setShow] = useState(false)
  const [requesting, setRequesting] = useState(false)

  useEffect(() => {
    if (!('Notification' in window)) return
    if (Notification.permission === 'default') {
      // 3 saniyə sonra göstər
      const t = setTimeout(() => setShow(true), 3000)
      return () => clearTimeout(t)
    }
  }, [])

  const requestPermission = async () => {
    setRequesting(true)
    const permission = await Notification.requestPermission()
    setRequesting(false)
    setShow(false)
    if (permission === 'granted') {
      // Test bildirişi göndər
      new Notification('🔔 AlcoPoint Task', {
        body: 'Bildirişlər aktivləşdirildi! Tapşırıq xatırlatmalarını alacaqsınız.',
        icon: '/favicon.ico',
      })
    }
  }

  if (!show) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-fade-in">
      <div className="bg-card border border-border rounded-xl p-4 shadow-2xl shadow-black/20">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-amber-100 dark:bg-amber-950/30 rounded-full flex items-center justify-center flex-shrink-0">
            <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Bildirişlərə icazə verin</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Tapşırıq xatırlatmaları, gecikmiş tapşırıqlar və yeni bildirişlər üçün icazə verin.
            </p>
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={requestPermission}
                disabled={requesting}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {requesting ? (
                  <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Check className="w-3 h-3" />
                )}
                İcazə ver
              </button>
              <button
                onClick={() => setShow(false)}
                className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                İndi yox
              </button>
            </div>
          </div>
          <button
            onClick={() => setShow(false)}
            className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
