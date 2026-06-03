'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'
import { Task, Profile } from '@/lib/types'
import { toast } from 'sonner'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function EditTaskPage() {
  const { id } = useParams<{ id: string }>()
  const { user, isAdmin } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    basliq: '', tesvir: '', icraci: '', prioritet: 'orta', status: 'gozleyir', son_tarix: '',
  })
  const supabase = createClient()

  const fetchData = useCallback(async () => {
    const [taskRes, usersRes] = await Promise.all([
      supabase.from('tasks').select('*').eq('id', id).single(),
      supabase.from('profiles').select('*').order('ad_soyad'),
    ])
    if (taskRes.data) {
      const t = taskRes.data as Task
      setForm({
        basliq: t.basliq,
        tesvir: t.tesvir || '',
        icraci: t.icraci || '',
        prioritet: t.prioritet,
        status: t.status,
        son_tarix: t.son_tarix ? new Date(t.son_tarix).toISOString().slice(0, 16) : '',
      })
    }
    if (usersRes.data) setUsers(usersRes.data as Profile[])
    setLoading(false)
  }, [id, supabase])

  useEffect(() => {
    if (!isAdmin) { router.push('/dashboard/tasks'); return }
    fetchData()
  }, [isAdmin, router, fetchData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.basliq.trim()) { toast.error('Başlıq daxil edin'); return }
    setSaving(true)
    const { error } = await supabase.from('tasks').update({
      basliq: form.basliq.trim(),
      tesvir: form.tesvir.trim() || null,
      icraci: form.icraci || null,
      prioritet: form.prioritet,
      status: form.status,
      son_tarix: form.son_tarix || null,
    }).eq('id', id)

    if (error) { toast.error('Yenilənmədi: ' + error.message); setSaving(false); return }

    await supabase.from('activity_log').insert({
      user_id: user?.id,
      task_id: id,
      emeliyyat: 'tapsirig_yenilendi',
      detallar: { basliq: form.basliq },
    })

    toast.success('Tapşırıq yeniləndi!')
    router.push(`/dashboard/tasks/${id}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const inputClass = "w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link
          href={`/dashboard/tasks/${id}`}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tapşırığı Redaktə Et</h1>
          <p className="text-muted-foreground text-sm">Dəyişiklikləri yadda saxlayın</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Başlıq <span className="text-rose-500">*</span></label>
          <input type="text" value={form.basliq} onChange={(e) => setForm(p => ({ ...p, basliq: e.target.value }))}
            className={inputClass} required />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Təsvir</label>
          <textarea value={form.tesvir} onChange={(e) => setForm(p => ({ ...p, tesvir: e.target.value }))}
            rows={4} className={inputClass + ' resize-none'} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">İcraçı</label>
            <select value={form.icraci} onChange={(e) => setForm(p => ({ ...p, icraci: e.target.value }))} className={inputClass}>
              <option value="">Seçin</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.ad_soyad}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Prioritet</label>
            <select value={form.prioritet} onChange={(e) => setForm(p => ({ ...p, prioritet: e.target.value }))} className={inputClass}>
              <option value="asagi">Aşağı</option>
              <option value="orta">Orta</option>
              <option value="yuksek">Yüksək</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Status</label>
            <select value={form.status} onChange={(e) => setForm(p => ({ ...p, status: e.target.value }))} className={inputClass}>
              <option value="gozleyir">Gözləyir</option>
              <option value="icra_olunur">İcra olunur</option>
              <option value="tamamlanib">Tamamlanıb</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Son Tarix</label>
            <input type="datetime-local" value={form.son_tarix} onChange={(e) => setForm(p => ({ ...p, son_tarix: e.target.value }))}
              className={inputClass} />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
          <Link href={`/dashboard/tasks/${id}`}
            className="px-4 py-2.5 text-sm font-medium text-foreground border border-border rounded-lg hover:bg-accent transition-colors">
            Ləğv et
          </Link>
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saxlanır...' : 'Yadda Saxla'}
          </button>
        </div>
      </form>
    </div>
  )
}
