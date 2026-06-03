'use client'

import { useState, useEffect } from 'react'
import { Volume2, VolumeX } from 'lucide-react'

const STORAGE_KEY = 'alcopoint-sound-enabled'

export function useSoundEnabled() {
  const [enabled, setEnabled] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== null) setEnabled(stored === 'true')
  }, [])

  const toggle = () => {
    const next = !enabled
    setEnabled(next)
    localStorage.setItem(STORAGE_KEY, String(next))
  }

  return { enabled, toggle }
}

export function SoundToggle() {
  const { enabled, toggle } = useSoundEnabled()

  return (
    <button
      onClick={toggle}
      title={enabled ? 'Səsi söndür' : 'Səsi aç'}
      className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors relative"
    >
      {enabled ? (
        <Volume2 className="w-5 h-5" />
      ) : (
        <VolumeX className="w-5 h-5 text-rose-400" />
      )}
    </button>
  )
}
