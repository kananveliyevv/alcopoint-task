'use client'

import { useCallback, useRef } from 'react'

type SoundType = 'yeni_tapsirig' | 'status_deyisdi' | 'yeni_serh' | 'xatirlatma' | 'gecikme'

export function useNotificationSound() {
  const audioCtxRef = useRef<AudioContext | null>(null)

  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    }
    return audioCtxRef.current
  }, [])

  // Yeni tapşırıq — iki artan not (ding-dong)
  const playNewTask = useCallback(() => {
    try {
      const ctx = getAudioContext()
      const notes = [523.25, 659.25] // C5, E5
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'sine'
        osc.frequency.value = freq
        const t = ctx.currentTime + i * 0.18
        gain.gain.setValueAtTime(0, t)
        gain.gain.linearRampToValueAtTime(0.35, t + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35)
        osc.start(t)
        osc.stop(t + 0.35)
      })
    } catch { /* AudioContext permission yoxdur */ }
  }, [getAudioContext])

  // Status dəyişdi — qısa xoş zəng
  const playStatusChange = useCallback(() => {
    try {
      const ctx = getAudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(440, ctx.currentTime)
      osc.frequency.linearRampToValueAtTime(880, ctx.currentTime + 0.15)
      gain.gain.setValueAtTime(0, ctx.currentTime)
      gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.4)
    } catch { /* ignore */ }
  }, [getAudioContext])

  // Yeni şərh — yüngül tıq
  const playNewComment = useCallback(() => {
    try {
      const ctx = getAudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = 800
      gain.gain.setValueAtTime(0.2, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.2)
    } catch { /* ignore */ }
  }, [getAudioContext])

  // Xatırlatma — 3 dəfə zəng (alarm)
  const playReminder = useCallback(() => {
    try {
      const ctx = getAudioContext()
      const pattern = [0, 0.4, 0.8]
      pattern.forEach((delay) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'square'
        osc.frequency.value = 660
        const t = ctx.currentTime + delay
        gain.gain.setValueAtTime(0, t)
        gain.gain.linearRampToValueAtTime(0.25, t + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3)
        osc.start(t)
        osc.stop(t + 0.3)
      })
    } catch { /* ignore */ }
  }, [getAudioContext])

  // Gecikme xəbərdarlığı — narahat edici alarm
  const playOverdue = useCallback(() => {
    try {
      const ctx = getAudioContext()
      const freqs = [220, 196, 220, 196]
      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'sawtooth'
        osc.frequency.value = freq
        const t = ctx.currentTime + i * 0.25
        gain.gain.setValueAtTime(0, t)
        gain.gain.linearRampToValueAtTime(0.2, t + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22)
        osc.start(t)
        osc.stop(t + 0.22)
      })
    } catch { /* ignore */ }
  }, [getAudioContext])

  // Uğur səsi — tamamlandı
  const playSuccess = useCallback(() => {
    try {
      const ctx = getAudioContext()
      const notes = [523.25, 659.25, 783.99] // C5-E5-G5
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'sine'
        osc.frequency.value = freq
        const t = ctx.currentTime + i * 0.14
        gain.gain.setValueAtTime(0, t)
        gain.gain.linearRampToValueAtTime(0.3, t + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4)
        osc.start(t)
        osc.stop(t + 0.4)
      })
    } catch { /* ignore */ }
  }, [getAudioContext])

  const playSound = useCallback((type: SoundType) => {
    switch (type) {
      case 'yeni_tapsirig': playNewTask(); break
      case 'status_deyisdi': playStatusChange(); break
      case 'yeni_serh': playNewComment(); break
      case 'xatirlatma': playReminder(); break
      case 'gecikme': playOverdue(); break
    }
  }, [playNewTask, playStatusChange, playNewComment, playReminder, playOverdue])

  return { playSound, playSuccess, playReminder, playOverdue }
}
