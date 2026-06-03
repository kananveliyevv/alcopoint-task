'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'
import { Task, ActivityLog, DashboardStats } from '@/lib/types'
import { formatDateTime, isOverdue, cn } from '@/lib/utils'
import { STATUS_LABELS, PRIORITET_LABELS, STATUS_COLORS, PRIORITET_COLORS } from '@/lib/constants'
import Link from 'next/link'
import {
  CheckSquare,
  Clock,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  ListTodo,
  Activity,
  Plus,
} from 'lucide-react'

export default function DashboardPage() {
  const { user, isAdmin } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({ umumi: 0, tamamlanmis: 0, davam_eden: 0, gecikmis: 0 })
  const [recentTasks, setRecentTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchData = useCallback(async () => {
    if (!user) return
    try {
      let query = supabase.from('tasks').select(`
        *,
        icraci_profile:profiles!tasks_icraci_fkey(id, ad_soyad, email),
        yaradan_profile:profiles!tasks_yaradan_fkey(id, ad_soyad, email)
      `)

      if (!isAdmin) {
        query = query.eq('icraci', user.id)
      }

      const { data: tasks } = await query.order('yaradilib', { ascending: false })

      if (tasks) {
        const now = new Date()
        const gecikmis = tasks.filter(t =>
          t.son_tarix && new Date(t.son_tarix) < now && t.status !== 'tamamlanib'
        ).length

        setStats({
          umumi: tasks.length,
          tamamlanmis: tasks.filter(t => t.status === 'tamamlanib').length,
          davam_eden: tasks.filter(t => t.status === 'icra_olunur').length,
          gecikmis,
        })
        setRecentTasks(tasks.slice(0, 5) as Task[])
      }
    } finally {
      setLoading(false)
    }
  }, [user, isAdmin, supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const statCards = [
    {
      label: 'Ümumi Tapşırıq',
      value: stats.umumi,
      icon: ListTodo,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950/30',
    },
    {
      label: 'Tamamlanmış',
      value: stats.tamamlanmis,
      icon: CheckSquare,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    },
    {
      label: 'Davam Edən',
      value: stats.davam_eden,
      icon: Clock,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/30',
    },
    {
      label: 'Gecikmiş',
      value: stats.gecikmis,
      icon: AlertTriangle,
      color: 'text-rose-600 dark:text-rose-400',
      bg: 'bg-rose-50 dark:bg-rose-950/30',
    },
  ]

  const completionRate = stats.umumi > 0
    ? Math.round((stats.tamamlanmis / stats.umumi) * 100)
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">İdarəetmə Paneli</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Tapşırıqlarınızın ümumi vəziyyəti
          </p>
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

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div key={stat.label} className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className={cn('p-2 rounded-lg', stat.bg)}>
                <stat.icon className={cn('w-5 h-5', stat.color)} />
              </div>
            </div>
            {loading ? (
              <div className="h-8 w-16 bg-muted animate-pulse rounded" />
            ) : (
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Progress */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Tamamlanma Faizi</h3>
          </div>
          <span className="text-2xl font-bold text-foreground">{completionRate}%</span>
        </div>
        <div className="w-full bg-muted rounded-full h-3">
          <div
            className="bg-primary h-3 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${completionRate}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {stats.tamamlanmis} tapşırıq {stats.umumi}-dən tamamlandı
        </p>
      </div>

      {/* Recent Tasks */}
      <div className="bg-card border border-border rounded-xl">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Son Tapşırıqlar</h3>
          </div>
          <Link
            href="/dashboard/tasks"
            className="flex items-center gap-1 text-sm text-primary hover:underline"
          >
            Hamısı
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <div className="divide-y divide-border">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="p-4 flex gap-3">
                <div className="h-4 bg-muted animate-pulse rounded flex-1" />
                <div className="h-4 w-20 bg-muted animate-pulse rounded" />
              </div>
            ))}
          </div>
        ) : recentTasks.length === 0 ? (
          <div className="py-12 text-center">
            <CheckSquare className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Tapşırıq tapılmadı</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {recentTasks.map((task) => {
              const gecikib = task.son_tarix ? isOverdue(task.son_tarix) && task.status !== 'tamamlanib' : false
              return (
                <Link
                  key={task.id}
                  href={`/dashboard/tasks/${task.id}`}
                  className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors group"
                >
                  <div className={cn(
                    'w-1 h-10 rounded-full flex-shrink-0',
                    task.prioritet === 'yuksek' ? 'bg-rose-500' :
                    task.prioritet === 'orta' ? 'bg-amber-500' : 'bg-emerald-500'
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'text-sm font-medium truncate',
                      task.status === 'tamamlanib' ? 'line-through text-muted-foreground' : 'text-foreground'
                    )}>
                      {task.basliq}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {task.icraci_profile?.ad_soyad || 'Təyin edilməyib'}
                      {gecikib && <span className="text-rose-500 ml-2">• Gecikib</span>}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_COLORS[task.status])}>
                      {STATUS_LABELS[task.status]}
                    </span>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', PRIORITET_COLORS[task.prioritet])}>
                      {PRIORITET_LABELS[task.prioritet]}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
