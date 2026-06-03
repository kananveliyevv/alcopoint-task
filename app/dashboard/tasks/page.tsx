'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'
import { Task, TaskFilters, Status, Prioritet } from '@/lib/types'
import { STATUS_LABELS, STATUS_COLORS, PRIORITET_LABELS, PRIORITET_COLORS } from '@/lib/constants'
import { formatDate, isOverdue, cn } from '@/lib/utils'
import Link from 'next/link'
import {
  Plus, Search, Filter, SortDesc, Eye, Edit, Trash2,
  Calendar, User, AlertTriangle, ChevronDown, X
} from 'lucide-react'
import { toast } from 'sonner'

export default function TasksPage() {
  const { user, isAdmin } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [filters, setFilters] = useState<TaskFilters>({ status: 'all', prioritet: 'all', axtaris: '' })
  const [showFilters, setShowFilters] = useState(false)
  const supabase = createClient()

  const fetchTasks = useCallback(async () => {
    if (!user) return
    let query = supabase
      .from('tasks')
      .select(`
        *,
        icraci_profile:profiles!tasks_icraci_fkey(id, ad_soyad, email),
        yaradan_profile:profiles!tasks_yaradan_fkey(id, ad_soyad, email)
      `)
      .order('yaradilib', { ascending: false })

    if (!isAdmin) {
      query = query.eq('icraci', user.id)
    }
    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status as Status)
    }
    if (filters.prioritet && filters.prioritet !== 'all') {
      query = query.eq('prioritet', filters.prioritet as Prioritet)
    }

    const { data, error } = await query
    if (error) { toast.error('Tapşırıqlar yüklənmədi'); return }
    let result = (data as Task[]) || []
    if (filters.axtaris) {
      const q = filters.axtaris.toLowerCase()
      result = result.filter(t => t.basliq.toLowerCase().includes(q) || t.tesvir?.toLowerCase().includes(q))
    }
    setTasks(result)
    setLoading(false)
  }, [user, isAdmin, filters, supabase])

  useEffect(() => {
    fetchTasks()

    // Realtime
    const channel = supabase
      .channel('tasks-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, fetchTasks)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchTasks, supabase])

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (error) { toast.error('Silinmədi'); return }
    toast.success('Tapşırıq silindi')
    setDeleteId(null)
    fetchTasks()
  }

  const activeFiltersCount = [
    filters.status !== 'all' && filters.status,
    filters.prioritet !== 'all' && filters.prioritet,
    filters.axtaris,
  ].filter(Boolean).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tapşırıqlar</h1>
          <p className="text-muted-foreground text-sm mt-1">{tasks.length} tapşırıq</p>
        </div>
        {isAdmin && (
          <Link
            href="/dashboard/tasks/new"
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Yeni Tapşırıq</span>
          </Link>
        )}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Tapşırıq axtar..."
            value={filters.axtaris || ''}
            onChange={(e) => setFilters(prev => ({ ...prev, axtaris: e.target.value }))}
            className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 border rounded-lg text-sm font-medium transition-colors',
            showFilters || activeFiltersCount > 0
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-card border-border text-foreground hover:bg-accent'
          )}
        >
          <Filter className="w-4 h-4" />
          Filterlər
          {activeFiltersCount > 0 && (
            <span className="bg-white/20 text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {activeFiltersCount}
            </span>
          )}
          <ChevronDown className={cn('w-4 h-4 transition-transform', showFilters && 'rotate-180')} />
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap gap-4 animate-fade-in">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Status</label>
            <select
              value={filters.status || 'all'}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as Status | 'all' }))}
              className="px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="all">Hamısı</option>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Prioritet</label>
            <select
              value={filters.prioritet || 'all'}
              onChange={(e) => setFilters(prev => ({ ...prev, prioritet: e.target.value as Prioritet | 'all' }))}
              className="px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="all">Hamısı</option>
              {Object.entries(PRIORITET_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => setFilters({ status: 'all', prioritet: 'all', axtaris: '' })}
            className="self-end flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground px-2 py-2"
          >
            <X className="w-4 h-4" />
            Sıfırla
          </button>
        </div>
      )}

      {/* Tasks Table/List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-card border border-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="bg-card border border-border rounded-xl py-16 text-center">
          <SortDesc className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium text-foreground">Tapşırıq tapılmadı</p>
          <p className="text-muted-foreground text-sm mt-1">Filter şərtlərini dəyişin</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tapşırıq</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">İcraçı</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Prioritet</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Son tarix</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tasks.map((task) => {
                  const gecikib = task.son_tarix ? isOverdue(task.son_tarix) && task.status !== 'tamamlanib' : false
                  return (
                    <tr key={task.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'w-1 h-8 rounded-full flex-shrink-0',
                            task.prioritet === 'yuksek' ? 'bg-rose-500' :
                            task.prioritet === 'orta' ? 'bg-amber-500' : 'bg-emerald-500'
                          )} />
                          <div>
                            <p className={cn(
                              'font-medium text-foreground',
                              task.status === 'tamamlanib' && 'line-through text-muted-foreground'
                            )}>{task.basliq}</p>
                            {task.tesvir && (
                              <p className="text-xs text-muted-foreground mt-0.5 max-w-xs truncate">{task.tesvir}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
                            {task.icraci_profile?.ad_soyad?.charAt(0) || '?'}
                          </div>
                          <span className="text-foreground text-sm">
                            {task.icraci_profile?.ad_soyad || <span className="text-muted-foreground italic">Təyin edilməyib</span>}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium', PRIORITET_COLORS[task.prioritet])}>
                          {PRIORITET_LABELS[task.prioritet]}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium', STATUS_COLORS[task.status])}>
                          {STATUS_LABELS[task.status]}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {task.son_tarix ? (
                          <div className="flex items-center gap-1.5">
                            {gecikib && <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />}
                            <span className={cn('text-sm', gecikib ? 'text-rose-500 font-medium' : 'text-foreground')}>
                              {formatDate(task.son_tarix)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1 justify-end">
                          <Link
                            href={`/dashboard/tasks/${task.id}`}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          {isAdmin && (
                            <>
                              <Link
                                href={`/dashboard/tasks/${task.id}/edit`}
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors"
                              >
                                <Edit className="w-4 h-4" />
                              </Link>
                              <button
                                onClick={() => setDeleteId(task.id)}
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {tasks.map((task) => {
              const gecikib = task.son_tarix ? isOverdue(task.son_tarix) && task.status !== 'tamamlanib' : false
              return (
                <div key={task.id} className={cn('bg-card border border-border rounded-xl p-4', {
                  'priority-yuksek': task.prioritet === 'yuksek',
                  'priority-orta': task.prioritet === 'orta',
                  'priority-asagi': task.prioritet === 'asagi',
                })}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <p className={cn(
                      'font-medium text-foreground',
                      task.status === 'tamamlanib' && 'line-through text-muted-foreground'
                    )}>{task.basliq}</p>
                    <div className="flex gap-1">
                      <Link href={`/dashboard/tasks/${task.id}`} className="p-1 text-muted-foreground">
                        <Eye className="w-4 h-4" />
                      </Link>
                      {isAdmin && (
                        <Link href={`/dashboard/tasks/${task.id}/edit`} className="p-1 text-muted-foreground">
                          <Edit className="w-4 h-4" />
                        </Link>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_COLORS[task.status])}>
                      {STATUS_LABELS[task.status]}
                    </span>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', PRIORITET_COLORS[task.prioritet])}>
                      {PRIORITET_LABELS[task.prioritet]}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {task.icraci_profile?.ad_soyad || 'Təyin edilməyib'}
                    </div>
                    {task.son_tarix && (
                      <div className={cn('flex items-center gap-1', gecikib && 'text-rose-500')}>
                        <Calendar className="w-3 h-3" />
                        {formatDate(task.son_tarix)}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Delete Confirm Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="w-12 h-12 bg-rose-100 dark:bg-rose-950/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-rose-600" />
            </div>
            <h3 className="text-lg font-semibold text-foreground text-center mb-2">Tapşırığı Sil</h3>
            <p className="text-muted-foreground text-sm text-center mb-6">
              Bu tapşırığı silmək istədiyinizə əminsiniz? Bu əməliyyat geri qaytarıla bilməz.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 px-4 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-accent transition-colors"
              >
                Ləğv et
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
