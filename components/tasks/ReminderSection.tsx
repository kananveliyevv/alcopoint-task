'use client'

import { useState } from 'react'
import { Bell, BellOff, Clock, Repeat, ChevronDown, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { XatirlatmaTekrar } from '@/lib/types'

interface ReminderSectionProps {
  xatirlatmaAktiv: boolean
  xatirlatmaVaxt: string
  xatirlatmaTekrar: XatirlatmaTekrar
  onChange: (data: {
    xatirlatma_aktiv: boolean
    xatirlatma_vaxt: string
    xatirlatma_tekrar: XatirlatmaTekrar
  }) => void
  sonTarix?: string
}

const TEKRAR_OPTIONS: { value: XatirlatmaTekrar; label: string; icon: string }[] = [
  { value: 'hec', label: 'Bir dəfə', icon: '1️⃣' },
  { value: 'gundelik', label: 'Gündəlik', icon: '📅' },
  { value: 'heftelik', label: 'Həftəlik', icon: '📆' },
  { value: 'ayliq', label: 'Aylıq', icon: '🗓️' },
]

const QUICK_TIMES = [
  { label: '15 dəq', minutes: 15 },
  { label: '30 dəq', minutes: 30 },
  { label: '1 saat', minutes: 60 },
  { label: '2 saat', minutes: 120 },
  { label: '1 gün', minutes: 1440 },
]

export function ReminderSection({
  xatirlatmaAktiv,
  xatirlatmaVaxt,
  xatirlatmaTekrar,
  onChange,
  sonTarix,
}: ReminderSectionProps) {
  const [expanded, setExpanded] = useState(xatirlatmaAktiv)

  const handleToggle = () => {
    const newActive = !xatirlatmaAktiv
    setExpanded(newActive)
    // Default vaxt: indi + 1 saat
    const defaultTime = new Date(Date.now() + 60 * 60 * 1000)
      .toISOString()
      .slice(0, 16)
    onChange({
      xatirlatma_aktiv: newActive,
      xatirlatma_vaxt: newActive ? (xatirlatmaVaxt || defaultTime) : '',
      xatirlatma_tekrar: xatirlatmaTekrar,
    })
  }

  const setQuickTime = (minutes: number) => {
    const t = new Date(Date.now() + minutes * 60 * 1000)
      .toISOString()
      .slice(0, 16)
    onChange({ xatirlatma_aktiv: true, xatirlatma_vaxt: t, xatirlatma_tekrar: xatirlatmaTekrar })
    setExpanded(true)
  }

  const setBeforeDeadline = (minutesBefore: number) => {
    if (!sonTarix) return
    const deadline = new Date(sonTarix)
    const reminderTime = new Date(deadline.getTime() - minutesBefore * 60 * 1000)
    const t = reminderTime.toISOString().slice(0, 16)
    onChange({ xatirlatma_aktiv: true, xatirlatma_vaxt: t, xatirlatma_tekrar: xatirlatmaTekrar })
    setExpanded(true)
  }

  const inputClass = "w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      {/* Header toggle */}
      <button
        type="button"
        onClick={handleToggle}
        className={cn(
          'w-full flex items-center justify-between p-4 transition-colors text-left',
          xatirlatmaAktiv
            ? 'bg-amber-50 dark:bg-amber-950/20 border-b border-amber-200 dark:border-amber-800'
            : 'bg-muted/30 hover:bg-muted/50'
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-9 h-9 rounded-full flex items-center justify-center transition-colors',
            xatirlatmaAktiv
              ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30'
              : 'bg-muted text-muted-foreground'
          )}>
            {xatirlatmaAktiv ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
          </div>
          <div>
            <p className={cn(
              'text-sm font-semibold',
              xatirlatmaAktiv ? 'text-amber-700 dark:text-amber-400' : 'text-foreground'
            )}>
              Xatırlatma
            </p>
            <p className="text-xs text-muted-foreground">
              {xatirlatmaAktiv
                ? xatirlatmaVaxt
                  ? `${new Date(xatirlatmaVaxt).toLocaleString('az-AZ', { dateStyle: 'short', timeStyle: 'short' })} — ${TEKRAR_OPTIONS.find(t => t.value === xatirlatmaTekrar)?.label}`
                  : 'Vaxt seçin'
                : 'Xatırlatma əlavə et'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {xatirlatmaAktiv && (
            <span className="text-xs bg-amber-500 text-white px-2 py-0.5 rounded-full font-medium">
              Aktiv
            </span>
          )}
          <ChevronDown className={cn(
            'w-4 h-4 text-muted-foreground transition-transform',
            expanded && 'rotate-180'
          )} />
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="p-4 space-y-4 bg-card animate-fade-in">
          {/* Quick time buttons */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Sürətli seçim (indi + ...)
            </p>
            <div className="flex flex-wrap gap-2">
              {QUICK_TIMES.map(qt => (
                <button
                  key={qt.minutes}
                  type="button"
                  onClick={() => setQuickTime(qt.minutes)}
                  className="px-3 py-1.5 text-xs font-medium bg-muted hover:bg-primary hover:text-primary-foreground rounded-lg transition-colors border border-border"
                >
                  {qt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Before deadline shortcuts */}
          {sonTarix && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Son tarixdən əvvəl
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: '1 saat əvvəl', min: 60 },
                  { label: '3 saat əvvəl', min: 180 },
                  { label: '1 gün əvvəl', min: 1440 },
                  { label: '3 gün əvvəl', min: 4320 },
                ].map(opt => (
                  <button
                    key={opt.min}
                    type="button"
                    onClick={() => setBeforeDeadline(opt.min)}
                    className="px-3 py-1.5 text-xs font-medium bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors border border-blue-200 dark:border-blue-800"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Exact time picker */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Dəqiq vaxt
            </label>
            <input
              type="datetime-local"
              value={xatirlatmaVaxt}
              onChange={(e) => onChange({
                xatirlatma_aktiv: true,
                xatirlatma_vaxt: e.target.value,
                xatirlatma_tekrar: xatirlatmaTekrar,
              })}
              min={new Date().toISOString().slice(0, 16)}
              className={inputClass}
            />
          </div>

          {/* Repeat */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5 flex items-center gap-1">
              <Repeat className="w-3 h-3" />
              Təkrar
            </label>
            <div className="grid grid-cols-2 gap-2">
              {TEKRAR_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onChange({
                    xatirlatma_aktiv: xatirlatmaAktiv,
                    xatirlatma_vaxt: xatirlatmaVaxt,
                    xatirlatma_tekrar: opt.value,
                  })}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-all',
                    xatirlatmaTekrar === opt.value
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-background text-foreground border-border hover:bg-accent'
                  )}
                >
                  <span>{opt.icon}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Info */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <Info className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-600 dark:text-blue-400">
              Xatırlatma vaxtı gəldikdə səs siqnalı və bildiriş alacaqsınız. Browser bildirişlərinə icazə verin.
            </p>
          </div>

          {/* Disable button */}
          <button
            type="button"
            onClick={handleToggle}
            className="w-full py-2 text-sm text-muted-foreground hover:text-rose-500 transition-colors flex items-center justify-center gap-2"
          >
            <BellOff className="w-3.5 h-3.5" />
            Xatırlatmanı söndür
          </button>
        </div>
      )}
    </div>
  )
}
