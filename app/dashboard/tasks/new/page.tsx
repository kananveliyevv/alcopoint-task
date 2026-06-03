'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'
import { Profile, XatirlatmaTekrar } from '@/lib/types'
import { toast } from 'sonner'
import { ArrowLeft, Save, Calendar, User, Flag, AlignLeft, Type } from 'lucide-react'
import Link from 'next/link'
import { ReminderSection } from '@/components/tasks/ReminderSection'

export default function NewTaskPage() {
  const { user, isAdmin } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    basliq: '',
    tesvir: '',
    icraci: '',
    prioritet: 'orta',
    status: 'gozleyir',
    son_tarix: '',
  })
  const [reminder, setReminder] = useState({
    xatirlatma_aktiv: false,
    xatirlatma_vaxt: '',
    xatirlatma_tekrar: 'hec' as XatirlatmaTekrar,
  })
  const supabase = createClient()

  const fetchUsers = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('*').order('ad_soyad')
    if (data) setUsers(data as Profile[])
  }, [supabase])

  useEffect(() => {
    if (!isAdmin) {
      router.push('/dashboard/tasks')
      return
    }
    fetchUsers()
  }, [isAdmin, router, fetchUsers])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.basliq.trim()) {
      toast.error('Başlıq daxil edin')
      return
    }
    if (!user) return
    setLoading(true)
    try {
      const payload: Record<string, unknown> = {
        basliq: form.basliq.trim(),
        tesvir: form.tesvir.trim() || null,
        icraci: form.icraci || null,
        yaradan: user.id,
        prioritet: form.prioritet,
        status: form.status,
        son_tarix: form.son_tarix || null,
        xatirlatma_aktiv: reminder.xatirlatma_aktiv,
        xatirlatma_vaxt: reminder.xatirlatma_aktiv && reminder.xatirlatma_vaxt
          ? new Date(reminder.xatirlatma_vaxt).toISOString()
          : null,
        xatirlatma_tekrar: reminder.xatirlatma_aktiv ? reminder.xatirlatma_tekrar : null,
      }

      const { data: task, error } = await supabase
        .from('tasks')
        .insert(payload)
        .select()
        .single()

      if (error) { toast.error('Tapşırıq yaradılmadı: ' + error.message); return }

      // İcraçıya bildiriş göndər
      if (form.icraci && form.icraci !== user.id) {
        await supabase.from('notifications').insert({
          user_id: form.icraci,
          task_id: task.id,
          tip: 'yeni_tapsirig',
          mesaj: `"${form.basliq}" tapşırığı sizə təyin edildi`,
        })
      }

      // Activity log
      await supabase.from('activity_log').insert({
        user_id: user.id,
        task_id: task.id,
        emeliyyat: 'tapsirig_yaradildi',
        detallar: {
          basliq: form.basliq,
          xatirlatma: reminder.xatirlatma_aktiv,
        },
      })

      toast.success('Tapşırıq uğurla yaradıldı!')
      router.push(`/dashboard/tasks/${task.id}`)
    } finally {
      setLoading(false)
    }
  }

  const inputClass = "w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
  const labelClass = "flex items-center gap-2 text-sm font-medium text-foreground mb-2"

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/dashboard/tasks"
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Yeni Tapşırıq</h1>
          <p className="text-muted-foreground text-sm">Yeni tapşırıq yaradın</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-6 space-y-5">
        {/* Başlıq */}
        <div>
          <label className={labelClass}>
            <Type className="w-4 h-4 text-primary" />
            Başlıq <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={form.basliq}
            onChange={(e) => setForm(prev => ({ ...prev, basliq: e.target.value }))}
            placeholder="Tapşırığın başlığını daxil edin"
            className={inputClass}
            required
          />
        </div>

        {/* Təsvir */}
        <div>
          <label className={labelClass}>
            <AlignLeft className="w-4 h-4 text-primary" />
            Təsvir
          </label>
          <textarea
            value={form.tesvir}
            onChange={(e) => setForm(prev => ({ ...prev, tesvir: e.target.value }))}
            placeholder="Tapşırıq haqqında ətraflı məlumat..."
            rows={4}
            className={inputClass + ' resize-none'}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* İcraçı */}
          <div>
            <label className={labelClass}>
              <User className="w-4 h-4 text-primary" />
              İcraçı
            </label>
            <select
              value={form.icraci}
              onChange={(e) => setForm(prev => ({ ...prev, icraci: e.target.value }))}
              className={inputClass}
            >
              <option value="">İcraçı seçin</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  {u.ad_soyad} ({u.rol === 'admin' ? 'Admin' : 'İşçi'})
                </option>
              ))}
            </select>
          </div>

          {/* Prioritet */}
          <div>
            <label className={labelClass}>
              <Flag className="w-4 h-4 text-primary" />
              Prioritet
            </label>
            <select
              value={form.prioritet}
              onChange={(e) => setForm(prev => ({ ...prev, prioritet: e.target.value }))}
              className={inputClass}
            >
              <option value="asagi">🟢 Aşağı</option>
              <option value="orta">🟡 Orta</option>
              <option value="yuksek">🔴 Yüksək</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label className={labelClass}>
              <span className="w-4 h-4 rounded-full bg-primary/20 inline-block flex-shrink-0" />
              Status
            </label>
            <select
              value={form.status}
              onChange={(e) => setForm(prev => ({ ...prev, status: e.target.value }))}
              className={inputClass}
            >
              <option value="gozleyir">⏳ Gözləyir</option>
              <option value="icra_olunur">🔄 İcra olunur</option>
              <option value="tamamlanib">✅ Tamamlanıb</option>
            </select>
          </div>

          {/* Son tarix */}
          <div>
            <label className={labelClass}>
              <Calendar className="w-4 h-4 text-primary" />
              Son Tarix
            </label>
            <input
              type="datetime-local"
              value={form.son_tarix}
              onChange={(e) => setForm(prev => ({ ...prev, son_tarix: e.target.value }))}
              min={new Date().toISOString().slice(0, 16)}
              className={inputClass}
            />
          </div>
        </div>

        {/* ===================== XATIRLATMA ===================== */}
        <div>
          <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
            🔔 Xatırlatma & Alarm
          </p>
          <ReminderSection
            xatirlatmaAktiv={reminder.xatirlatma_aktiv}
            xatirlatmaVaxt={reminder.xatirlatma_vaxt}
            xatirlatmaTekrar={reminder.xatirlatma_tekrar}
            onChange={setReminder}
            sonTarix={form.son_tarix}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
          <Link
            href="/dashboard/tasks"
            className="px-4 py-2.5 text-sm font-medium text-foreground border border-border rounded-lg hover:bg-accent transition-colors"
          >
            Ləğv et
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {loading ? 'Saxlanır...' : 'Tapşırıq Yarat'}
          </button>
        </div>
      </form>
    </div>
  )
}
