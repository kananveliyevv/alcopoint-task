'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'
import { Profile } from '@/lib/types'
import { formatDateTime, getInitials, cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import {
  UserPlus, Search, Crown, User, Mail, Calendar,
  MoreVertical, Shield, ShieldOff, Trash2, X, Eye, EyeOff
} from 'lucide-react'

export default function UsersPage() {
  const { isAdmin, user: currentUser } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [menuId, setMenuId] = useState<string | null>(null)
  const [addForm, setAddForm] = useState({ ad_soyad: '', email: '', password: '', rol: 'user' })
  const [adding, setAdding] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const supabase = createClient()

  const fetchUsers = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('*').order('yaradilib', { ascending: false })
    if (data) setUsers(data as Profile[])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    if (!isAdmin) { router.push('/dashboard'); return }
    fetchUsers()
  }, [isAdmin, router, fetchUsers])

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addForm.ad_soyad || !addForm.email || !addForm.password) {
      toast.error('Bütün xanaları doldurun')
      return
    }
    if (addForm.password.length < 6) {
      toast.error('Şifrə minimum 6 simvol olmalıdır')
      return
    }
    setAdding(true)
    try {
      // Supabase Auth-da istifadəçi yarat
      const { error } = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      }).then(r => r.json())

      if (error) { toast.error(error); return }
      toast.success('İstifadəçi yaradıldı!')
      setShowAddModal(false)
      setAddForm({ ad_soyad: '', email: '', password: '', rol: 'user' })
      fetchUsers()
    } finally {
      setAdding(false)
    }
  }

  const handleToggleRole = async (userId: string, currentRole: string) => {
    if (userId === currentUser?.id) { toast.error('Öz rolunuzu dəyişə bilməzsiniz'); return }
    const newRole = currentRole === 'admin' ? 'user' : 'admin'
    const { error } = await supabase.from('profiles').update({ rol: newRole }).eq('id', userId)
    if (error) { toast.error('Rol dəyişdirilmədi'); return }
    toast.success(`Rol ${newRole === 'admin' ? 'Admin' : 'İşçi'} olaraq dəyişdirildi`)
    setMenuId(null)
    fetchUsers()
  }

  const filtered = users.filter(u =>
    u.ad_soyad.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  const inputClass = "w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">İstifadəçilər</h1>
          <p className="text-muted-foreground text-sm">{users.length} istifadəçi</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          <span className="hidden sm:inline">İstifadəçi Əlavə Et</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="İstifadəçi axtar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {/* Users Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 bg-card border border-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl py-16 text-center">
          <User className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-foreground font-medium">İstifadəçi tapılmadı</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(u => (
            <div key={u.id} className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow relative">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                    {getInitials(u.ad_soyad)}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">{u.ad_soyad}</p>
                    <span className={cn(
                      'inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium mt-0.5',
                      u.rol === 'admin'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    )}>
                      {u.rol === 'admin' ? <Crown className="w-3 h-3" /> : <User className="w-3 h-3" />}
                      {u.rol === 'admin' ? 'Admin' : 'İşçi'}
                    </span>
                  </div>
                </div>

                {u.id !== currentUser?.id && (
                  <div className="relative">
                    <button
                      onClick={() => setMenuId(menuId === u.id ? null : u.id)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {menuId === u.id && (
                      <div className="absolute right-0 top-8 bg-popover border border-border rounded-xl shadow-xl z-20 min-w-[180px] overflow-hidden">
                        <button
                          onClick={() => handleToggleRole(u.id, u.rol)}
                          className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors"
                        >
                          {u.rol === 'admin' ? (
                            <><ShieldOff className="w-4 h-4" /> İşçiyə çevir</>
                          ) : (
                            <><Shield className="w-4 h-4" /> Admina çevir</>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Mail className="w-3.5 h-3.5" />
                  <span className="truncate">{u.email}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDateTime(u.yaradilib)}
                </div>
              </div>

              {u.id === currentUser?.id && (
                <div className="absolute top-3 right-3 text-xs text-primary font-medium">Siz</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-foreground">Yeni İstifadəçi</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Ad Soyad</label>
                <input type="text" value={addForm.ad_soyad}
                  onChange={(e) => setAddForm(p => ({ ...p, ad_soyad: e.target.value }))}
                  className={inputClass} placeholder="Əli Əliyev" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">E-poçt</label>
                <input type="email" value={addForm.email}
                  onChange={(e) => setAddForm(p => ({ ...p, email: e.target.value }))}
                  className={inputClass} placeholder="ali@example.com" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Şifrə</label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} value={addForm.password}
                    onChange={(e) => setAddForm(p => ({ ...p, password: e.target.value }))}
                    className={inputClass + ' pr-10'} placeholder="Minimum 6 simvol" required />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Rol</label>
                <select value={addForm.rol} onChange={(e) => setAddForm(p => ({ ...p, rol: e.target.value }))} className={inputClass}>
                  <option value="user">İşçi</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-accent">
                  Ləğv et
                </button>
                <button type="submit" disabled={adding}
                  className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2">
                  {adding && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  {adding ? 'Yaradılır...' : 'Yarat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Close menu on outside click */}
      {menuId && (
        <div className="fixed inset-0 z-10" onClick={() => setMenuId(null)} />
      )}
    </div>
  )
}
